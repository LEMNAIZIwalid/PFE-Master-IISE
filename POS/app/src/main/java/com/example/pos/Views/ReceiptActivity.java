package com.example.pos.Views;

import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.example.pos.R;
import java.text.DecimalFormat;
import java.util.Random;

public class ReceiptActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_receipt);

        // Bind standard close actions
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnDone).setOnClickListener(v -> finish());
        findViewById(R.id.btnShare).setOnClickListener(v -> {
            Toast.makeText(this, "Receipt shared successfully!", Toast.LENGTH_SHORT).show();
        });

        // Bind receipt detail views
        TextView tvReceiptStatus = findViewById(R.id.tvReceiptStatus);
        TextView tvReceiptAmount = findViewById(R.id.tvReceiptAmount);
        TextView tvDetailStatus = findViewById(R.id.tvDetailStatus);
        TextView tvDetailType = findViewById(R.id.tvDetailType);
        TextView tvDetailRecipient = findViewById(R.id.tvDetailRecipient);
        TextView tvDetailCard = findViewById(R.id.tvDetailCard);
        TextView tvDetailDate = findViewById(R.id.tvDetailDate);
        TextView tvDetailRef = findViewById(R.id.tvDetailRef);
        TextView tvBarcodeText = findViewById(R.id.tvBarcodeText);

        // Retrieve intent extras
        String txTitle = getIntent().getStringExtra("TX_TITLE");
        String txDate = getIntent().getStringExtra("TX_DATE");
        double txAmount = getIntent().getDoubleExtra("TX_AMOUNT", -1.0);
        String txType = getIntent().getStringExtra("TX_TYPE");
        String cardholderName = getIntent().getStringExtra("CARDHOLDER_NAME");
        String cardPan = getIntent().getStringExtra("CARD_PAN");

        // Set fallbacks for mock presentation if no transaction is active
        if (txTitle == null) txTitle = "POS Payment";
        if (txDate == null) txDate = new java.text.SimpleDateFormat("dd/MM/yyyy, HH:mm", java.util.Locale.getDefault()).format(new java.util.Date());
        if (txAmount < 0) txAmount = 25.50;
        if (txType == null) txType = "debit";
        if (cardPan == null || cardPan.trim().isEmpty()) cardPan = "xxxx  xxxx  8842  9173";
        if (cardholderName == null || cardholderName.trim().isEmpty()) cardholderName = "Bank Client";

        // 1. Format transaction title and status header
        if ("credit".equalsIgnoreCase(txType)) {
            tvReceiptStatus.setText("Transfer Received");
            tvReceiptAmount.setText("+ €" + formatAmount(txAmount));
            tvReceiptAmount.setTextColor(ContextCompat.getColor(this, R.color.success));
            tvDetailType.setText("Mobile Transfer");
            tvDetailRecipient.setText(cardholderName); // cardholder received it
        } else {
            if (txTitle.toLowerCase().contains("withdrawal") || txTitle.toLowerCase().contains("virement") || txTitle.toLowerCase().contains("transfer")) {
                tvReceiptStatus.setText("Transfer Sent");
                tvDetailType.setText("Transfer");
                tvDetailRecipient.setText("External Recipient");
            } else {
                tvReceiptStatus.setText("Payment Successful");
                tvDetailType.setText("POS Payment");
                tvDetailRecipient.setText("Merchant POS");
            }
            tvReceiptAmount.setText("- €" + formatAmount(txAmount));
            tvReceiptAmount.setTextColor(ContextCompat.getColor(this, R.color.text_primary));
        }

        // 2. Format payment method (PAN last 4 digits)
        String last4 = "9173";
        String cleanPan = cardPan.replaceAll("\\s+", "");
        if (cleanPan.length() >= 4) {
            last4 = cleanPan.substring(cleanPan.length() - 4);
        }
        tvDetailCard.setText("Visa ending in " + last4);

        // 3. Set Date
        tvDetailDate.setText(txDate);

        // 4. Generate reference ID
        String refId = generateRefId();
        tvDetailRef.setText(refId);
        tvBarcodeText.setText("*" + refId + "*");
    }

    private String formatAmount(double amount) {
        DecimalFormat df = new DecimalFormat("#,##0.00");
        return df.format(amount);
    }

    private String generateRefId() {
        Random r = new Random();
        int num = 100000000 + r.nextInt(900000000);
        return "TXN-" + num + "-POS";
    }
}
