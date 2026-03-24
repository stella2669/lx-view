// 캔버스 엔진을 초기화할 때 외부(React)에서 주입받는 설정값 인터페이스
export interface EngineOptions<T> {
    canvas: HTMLCanvasElement; // 실제 무대가 될 캔버스 DOM 요소
    motionBlur?: boolean;      // 꼬리가 남는 모션 블러 효과 사용 여부
    motionBlurAlpha?: number;  // 모션 블러의 투명도 (값이 낮을수록 꼬리가 길게 남음)
    getBgColor?: () => string; // 모션 블러 시 배경으로 덮을 색상 (테마 대응)

    // 매 프레임(초당 60회)마다 실행될 그리기 함수 (유저가 직접 로직을 정의해 넘김)
    onDraw: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
    // 마우스가 움직일 때 어떤 요소와 충돌(Hover)했는지 검사하는 함수
    onHitTest?: (x: number, y: number, width: number, height: number) => T | null;
    // 클릭 시 발생하는 콜백 함수 (hitTest의 결과를 인자로 받음)
    onClick?: (item: T | null, x: number, y: number, width: number, height: number) => void;

    // 드래그 기능 지원 콜백
    onDragStart?: (x: number, y: number) => void;
    onDrag?: (startX: number, startY: number, currentX: number, currentY: number) => void;
    onDragEnd?: (startX: number, startY: number, endX: number, endY: number) => void;
}

export class CanvasEngine<T> {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private rafId: number = 0;
    private dpr: number = 1;
    private options: EngineOptions<T>;
    private running: boolean = false;
    private resizeObserver: ResizeObserver;

    public width: number = 0;
    public height: number = 0;
    public mouseX: number = -1;
    public mouseY: number = -1;

    // 드래그 상태 관리
    private isDragging: boolean = false;
    private dragStartX: number = -1;
    private dragStartY: number = -1;

    constructor(options: EngineOptions<T>) {
        this.options = options;
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this.setupScale();
        this.resizeObserver = new ResizeObserver(() => this.setupScale());
        this.resizeObserver.observe(this.canvas);

        this.attachEvents();
    }

    private setupScale = () => {
        const bounds = this.canvas.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        this.width = bounds.width;
        this.height = bounds.height;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;

        this.ctx.scale(this.dpr, this.dpr);
    };

    private handleMouseMove = (e: MouseEvent) => {
        const bounds = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - bounds.left;
        this.mouseY = e.clientY - bounds.top;

        if (this.isDragging && this.options.onDrag) {
            this.options.onDrag(this.dragStartX, this.dragStartY, this.mouseX, this.mouseY);
        }
    };

    private handleClick = (e: MouseEvent) => {
        // 드래그 중이었다면 클릭 이벤트를 무시 (드래그 종료로 처리)
        if (this.isDragging) {
            return;
        }

        const bounds = this.canvas.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        this.mouseX = x;
        this.mouseY = y;

        if (this.options.onHitTest && this.options.onClick) {
            const hit = this.options.onHitTest(x, y, this.width, this.height);
            this.options.onClick(hit, x, y, this.width, this.height);
        }
    };

    private handleMouseDown = (e: MouseEvent) => {
        const bounds = this.canvas.getBoundingClientRect();
        this.dragStartX = e.clientX - bounds.left;
        this.dragStartY = e.clientY - bounds.top;
        this.isDragging = true;

        if (this.options.onDragStart) {
            this.options.onDragStart(this.dragStartX, this.dragStartY);
        }
    };

    private handleMouseUp = (e: MouseEvent) => {
        if (!this.isDragging) return;

        const bounds = this.canvas.getBoundingClientRect();
        const endX = e.clientX - bounds.left;
        const endY = e.clientY - bounds.top;

        // 마우스가 살짝만 움직여도 드래그로 인식되는 것을 방지하기 위한 임계값 (예: 5px)
        const dx = Math.abs(endX - this.dragStartX);
        const dy = Math.abs(endY - this.dragStartY);

        if (dx > 5 || dy > 5) {
            if (this.options.onDragEnd) {
                this.options.onDragEnd(this.dragStartX, this.dragStartY, endX, endY);
            }
        }
        
        // requestAnimationFrame이 클릭보다 늦게 처리될 수 있으므로 약간의 지연 후 isDragging 해제
        setTimeout(() => {
             this.isDragging = false;
        }, 0);
    };

    // 캔버스 밖으로 마우스가 나갔을 때 드래그 종료 처리
    private handleMouseLeave = (e: MouseEvent) => {
        if (this.isDragging) {
            this.handleMouseUp(e);
        }
    };

    private attachEvents = () => {
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.style.cursor = 'default';
    };

    private detachEvents = () => {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        this.canvas.removeEventListener('click', this.handleClick);
        this.resizeObserver.disconnect();
    };

    public start = () => {
        if (this.running) return;
        this.running = true;
        this.loop(performance.now());
    };

    public stop = () => {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
    };

    public destroy = () => {
        this.stop();
        this.detachEvents();
    };

    // 핵심 렌더링 루프 알고리즘. 컴퓨터 사양에 따라 보통 초당 60회(60 FPS) 실행됩니다.
    private loop = (time: number) => {
        if (!this.running) return;

        // [화면 지우기 로직]
        if (this.options.motionBlur) {
            // 모션 블러: 화면을 완전히 지우지 않고 반투명한 배경으로 덮어 이전 프레임의 잔상이 남게 함
            const alpha = this.options.motionBlurAlpha || 0.2;
            if (this.options.getBgColor) {
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = this.options.getBgColor();
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.ctx.globalAlpha = 1.0;
            } else {
                this.ctx.fillStyle = `rgba(10, 20, 30, ${alpha})`;
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        } else {
            // 일반 모드: 이전 프레임을 완전히 지워서 잔상 없이 깔끔하게 새로 그림
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        // 외부에서 주입받은 그리기 함수(사용자 지정 로직) 호출
        this.options.onDraw(this.ctx, this.width, this.height, time);

        // 마우스 호버(Hit-Test) 연산 수행 및 마우스 커서 포인터 변경 (O(N) 탐색)
        if (this.options.onHitTest && this.mouseX >= 0 && this.mouseY >= 0) {
            const hit = this.options.onHitTest(this.mouseX, this.mouseY, this.width, this.height);
            this.canvas.style.cursor = hit ? 'pointer' : 'default'; // 뭔가 닿았으면 손가락 모양 커서
        }

        // 브라우저 렌더링 사이클에 맞춰 다음 루프 예약 (백그라운드 탭으로 가면 자동 일시정지됨)
        this.rafId = requestAnimationFrame(this.loop);
    };
}
