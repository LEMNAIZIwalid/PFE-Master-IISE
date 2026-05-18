package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;
import java.text.DecimalFormat;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Get dynamic intent extras passed from LoginActivity
        String cardholderName = getIntent().getStringExtra("CARDHOLDER_NAME");
        double cardBalance = getIntent().getDoubleExtra("CARD_BALANCE", 2450.75);
        String cardPAN = getIntent().getStringExtra("CARD_PAN");

        // Bind layout views
        TextView tvGreeting = findViewById(R.id.tvGreeting);
        TextView tvBalanceAmount = findViewById(R.id.tvBalanceAmount);
        TextView tvCardPAN = findViewById(R.id.tvCardPAN);

        // Update greeting with authenticated client name
        if (cardholderName != null && !cardholderName.trim().isEmpty()) {
            tvGreeting.setText("Welcome, " + cardholderName);
        } else {
            tvGreeting.setText("Welcome, bankclient");
        }

        // Update balance display formatted in Euros (€)
        DecimalFormat df = new DecimalFormat("#,##0.00");
        String formattedBalance = "€ " + df.format(cardBalance);
        tvBalanceAmount.setText(formattedBalance);

        // Update PAN display if present
        if (cardPAN != null && !cardPAN.trim().isEmpty()) {
            tvCardPAN.setText(cardPAN);
        }

        // Profile button
        findViewById(R.id.btnProfile).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, ProfileActivity.class);
            startActivity(intent);
        });

        // Transfer button
        findViewById(R.id.btnTransfer).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, TransferActivity.class);
            startActivity(intent);
        });

        // History button
        findViewById(R.id.btnHistory).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, HistoryActivity.class);
            startActivity(intent);
        });

        // Receipt button
        findViewById(R.id.btnReceipt).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, ReceiptActivity.class);
            startActivity(intent);
        });
    }
}
