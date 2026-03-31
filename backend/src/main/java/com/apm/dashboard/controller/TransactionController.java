package com.apm.dashboard.controller;

import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.model.dto.TransactionDetailDto;
import com.apm.dashboard.service.TransactionDetailService;
import com.apm.dashboard.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 실시간 트랜잭션 데이터 및 상세 상세 이력을 제공하는 컨트롤러입니다.
 * X-View 차트 데이터와 개별 트랜잭션의 상세 스택 트레이스 정보를 조회합니다.
 */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionDetailService transactionDetailService;

    public TransactionController(TransactionService transactionService, TransactionDetailService transactionDetailService) {
        this.transactionService = transactionService;
        this.transactionDetailService = transactionDetailService;
    }

    /**
     * 최근 수집된 실시간 트랜잭션 목록을 조회합니다.
     * 대시보드 초기 진입 시 X-View 차트를 채우는 데 사용됩니다.
     * @return 최신 트랜잭션 데이터 리스트
     */
    @GetMapping("/history")
    public List<TransactionData> getHistory() {
        return transactionService.getRecentTransactions();
    }

    /**
     * 특정 트랜잭션의 ID를 기반으로 상세 정보(기본 정보 + 에러 상세 내역)를 조회합니다.
     * @param txId 트랜잭션 ID (Path Variable)
     * @return 트랜잭션 상세 DTO
     */
    @GetMapping("/{txId}")
    public ResponseEntity<TransactionDetailDto> getTransactionDetail(@PathVariable("txId") String txId) {
        // 1. 트랜잭션 기본 정보 조회
        return transactionService.findById(txId)
                .map(tx -> {
                    // 2. 상세 정보(Error/Stacktrace 등) 조회
                    TransactionDetailDto detail = transactionDetailService.getDetail(txId)
                            .orElse(new TransactionDetailDto());

                    // 기본 정보와 상세 정보를 병합하여 반환
                    detail.setTxId(tx.getId());
                    detail.setServiceName(tx.getServiceName());
                    detail.setTimestamp(tx.getTimestamp());
                    detail.setResponseTimeMs(tx.getResponseTimeMs());
                    detail.setHttpStatusCode(tx.getHttpStatusCode());
                    detail.setError(tx.isError());

                    return ResponseEntity.ok(detail);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 쿼리 파라미터를 사용하여 특정 트랜잭션의 상세 정보를 조회합니다.
     * @param txId 트랜잭션 ID (Request Param)
     * @return 트랜잭션 상세 DTO
     */
    @GetMapping("/detail")
    public ResponseEntity<TransactionDetailDto> getTransactionDetailByParam(@RequestParam("txId") String txId) {
        return transactionService.findById(txId)
                .map(tx -> {
                    TransactionDetailDto detail = transactionDetailService.getDetail(txId)
                            .orElse(new TransactionDetailDto());

                    detail.setTxId(tx.getId());
                    detail.setServiceName(tx.getServiceName());
                    detail.setTimestamp(tx.getTimestamp());
                    detail.setResponseTimeMs(tx.getResponseTimeMs());
                    detail.setHttpStatusCode(tx.getHttpStatusCode());
                    detail.setError(tx.isError());

                    return ResponseEntity.ok(detail);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
