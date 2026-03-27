package com.apm.dashboard.controller;

import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.model.dto.TransactionDetailDto;
import com.apm.dashboard.service.TransactionDetailService;
import com.apm.dashboard.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionDetailService transactionDetailService;

    public TransactionController(TransactionService transactionService, TransactionDetailService transactionDetailService) {
        this.transactionService = transactionService;
        this.transactionDetailService = transactionDetailService;
    }

    @GetMapping("/history")
    public List<TransactionData> getHistory() {
        return transactionService.getRecentTransactions();
    }

    @GetMapping("/{txId}")
    public ResponseEntity<TransactionDetailDto> getTransactionDetail(@PathVariable("txId") String txId) {
        // 1. 트랜잭션 기본 정보 조회
        return transactionService.findById(txId)
                .map(tx -> {
                    // 2. 상세 정보 조회
                    TransactionDetailDto detail = transactionDetailService.getDetail(txId)
                            .orElse(new TransactionDetailDto());

                    // Merge basic info into detail DTO
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

    @PostMapping("/list")
    public List<TransactionDetailDto> getDetails(@RequestBody List<String> txIds) {
        List<TransactionDetailDto> results = new ArrayList<>();
        for (String txId : txIds) {
            transactionService.findById(txId).ifPresent(tx -> {
                TransactionDetailDto detail = transactionDetailService.getDetail(txId)
                        .orElse(new TransactionDetailDto());

                detail.setTxId(tx.getId());
                detail.setServiceName(tx.getServiceName());
                detail.setTimestamp(tx.getTimestamp());
                detail.setResponseTimeMs(tx.getResponseTimeMs());
                detail.setHttpStatusCode(tx.getHttpStatusCode());
                detail.setError(tx.isError());

                results.add(detail);
            });
        }
        return results;
    }
}
