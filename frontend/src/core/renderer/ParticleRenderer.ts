export const ParticleRenderer = {
    drawDot: (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number = 2.5) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    },

    drawPulseRing: (ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color: string = 'rgba(129, 140, 248, 1)') => {
        const radius = 8 + Math.sin(time / 150) * 4;

        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(time / 150) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }
};
