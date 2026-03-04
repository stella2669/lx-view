package com.apm.dashboard.controller;

import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.service.TransactionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/history")
    public List<TransactionData> getHistory() {
        return transactionService.getRecentTransactions();
    }
}
