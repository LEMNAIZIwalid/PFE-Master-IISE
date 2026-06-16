package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.example.pos.R;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DecimalFormat;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private Handler pollHandler = new Handler();
    private Runnable pollRunnable;
    private String cardId;
    private String cardholderName;
    private String cardStatus;
    private double currentBalance;

    private TextView tvBalanceAmount;
    private LinearLayout layoutTx1;
    private TextView tvTx1Icon;
    private TextView tvTx1Title;
    private TextView tvTx1Date;
    private TextView tvTx1Amount;

    private LinearLayout layoutTx2;
    private TextView tvTx2Icon;
    private TextView tvTx2Title;
    private TextView tvTx2Date;
    private TextView tvTx2Amount;

    private String cardPAN;
    private org.json.JSONArray recentEventsList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Get dynamic intent extras passed from LoginActivity
        cardholderName = getIntent().getStringExtra("CARDHOLDER_NAME");
        cardId = getIntent().getStringExtra("CARD_ID");
        if (cardId == null || cardId.trim().isEmpty()) {
            cardId = "bankclient";
        }
        currentBalance = getIntent().getDoubleExtra("CARD_BALANCE", 2450.75);
        cardPAN = getIntent().getStringExtra("CARD_PAN");
        String tempStatus = getIntent().getStringExtra("CARD_STATUS");
        cardStatus = (tempStatus == null || tempStatus.trim().isEmpty()) ? "Active" : tempStatus;

        // Bind layout views
        TextView tvGreeting = findViewById(R.id.tvGreeting);
        tvBalanceAmount = findViewById(R.id.tvBalanceAmount);
        TextView tvCardPAN = findViewById(R.id.tvCardPAN);

        // Update greeting with authenticated client name
        if (cardholderName != null && !cardholderName.trim().isEmpty()) {
            tvGreeting.setText("Welcome, " + cardholderName);
        } else {
            tvGreeting.setText("Welcome, bankclient");
        }

        // Update balance display formatted in Euros (€)
        DecimalFormat df = new DecimalFormat("#,##0.00");
        String formattedBalance = "€ " + df.format(currentBalance);
        tvBalanceAmount.setText(formattedBalance);

        // Update PAN display if present
        if (cardPAN != null && !cardPAN.trim().isEmpty()) {
            tvCardPAN.setText(cardPAN);
        }

        // Profile button
        findViewById(R.id.btnProfile).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, ProfileActivity.class);
            intent.putExtra("CARDHOLDER_NAME", cardholderName);
            intent.putExtra("CARD_STATUS", cardStatus);
            startActivity(intent);
        });

        // Transfer button
        findViewById(R.id.btnTransfer).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, TransferActivity.class);
            intent.putExtra("CARD_ID", cardId);
            startActivity(intent);
        });

        // History button
        findViewById(R.id.btnHistory).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, HistoryActivity.class);
            intent.putExtra("CARD_ID", cardId);
            intent.putExtra("CARD_PAN", cardPAN);
            startActivity(intent);
        });

        // See All button
        findViewById(R.id.btnSeeAll).setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, HistoryActivity.class);
            intent.putExtra("CARD_ID", cardId);
            intent.putExtra("CARD_PAN", cardPAN);
            startActivity(intent);
        });

        // Receipt button
        findViewById(R.id.btnReceipt).setOnClickListener(v -> {
            if (recentEventsList != null && recentEventsList.length() > 0) {
                launchReceiptFor(recentEventsList.optJSONObject(0));
            } else {
                launchReceiptFor(null);
            }
        });

        // Bind transaction views
        layoutTx1 = findViewById(R.id.layoutTx1);
        tvTx1Icon = findViewById(R.id.tvTx1Icon);
        tvTx1Title = findViewById(R.id.tvTx1Title);
        tvTx1Date = findViewById(R.id.tvTx1Date);
        tvTx1Amount = findViewById(R.id.tvTx1Amount);

        layoutTx2 = findViewById(R.id.layoutTx2);
        tvTx2Icon = findViewById(R.id.tvTx2Icon);
        tvTx2Title = findViewById(R.id.tvTx2Title);
        tvTx2Date = findViewById(R.id.tvTx2Date);
        tvTx2Amount = findViewById(R.id.tvTx2Amount);

        // Click listeners on transactions list
        layoutTx1.setOnClickListener(v -> {
            if (recentEventsList != null && recentEventsList.length() > 0) {
                launchReceiptFor(recentEventsList.optJSONObject(0));
            }
        });

        layoutTx2.setOnClickListener(v -> {
            if (recentEventsList != null && recentEventsList.length() > 1) {
                launchReceiptFor(recentEventsList.optJSONObject(1));
            }
        });

        // Initial parse of RECENT_EVENTS_JSON from intent
        String recentEventsJson = getIntent().getStringExtra("RECENT_EVENTS_JSON");
        if (recentEventsJson != null && !recentEventsJson.trim().isEmpty()) {
            try {
                JSONArray eventsArr = new JSONArray(recentEventsJson);
                updateTransactionsUI(eventsArr);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Setup real-time spontaneous polling runnable
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                new Thread(() -> {
                    HttpURLConnection conn = null;
                    try {
                        URL url = new URL("http://10.0.2.2:5001/api/mobile/refresh/" + cardId);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("Accept", "application/json");
                        conn.setConnectTimeout(3000);
                        conn.setReadTimeout(3000);

                        if (conn.getResponseCode() == 200) {
                            InputStream is = conn.getInputStream();
                            try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"))) {
                                StringBuilder response = new StringBuilder();
                                String line;
                                while ((line = br.readLine()) != null) {
                                    response.append(line.trim());
                                }
                                JSONObject jsonObj = new JSONObject(response.toString());
                                final double newBalance = jsonObj.optDouble("amount", currentBalance);
                                final String newStatus = jsonObj.optString("card_status", cardStatus);
                                final JSONArray eventsArr = jsonObj.optJSONArray("recent_events");

                                runOnUiThread(() -> {
                                    currentBalance = newBalance;
                                    cardStatus = newStatus;
                                    DecimalFormat dfFmt = new DecimalFormat("#,##0.00");
                                    tvBalanceAmount.setText("€ " + dfFmt.format(currentBalance));

                                    if (eventsArr != null) {
                                        updateTransactionsUI(eventsArr);
                                    }
                                });
                            }
                        }
                    } catch (Exception e) {
                        // Silent catch for background polling
                    } finally {
                        if (conn != null) { conn.disconnect(); }
                    }
                }).start();

                pollHandler.postDelayed(this, 3000); // poll every 3 seconds
            }
        };
    }

    private void updateTransactionsUI(JSONArray eventsArr) {
        this.recentEventsList = eventsArr;
        DecimalFormat dfTx = new DecimalFormat("#,##0.00");

        // Update Tx1
        if (eventsArr.length() > 0) {
            layoutTx1.setVisibility(View.VISIBLE);
            JSONObject ev1 = eventsArr.optJSONObject(0);
            if (ev1 != null) {
                String title = ev1.optString("title", "Transaction");
                String date = ev1.optString("date", "Today");
                double amount = ev1.optDouble("amount", 0.0);
                String type = ev1.optString("type", "credit");

                tvTx1Title.setText(title);
                tvTx1Date.setText(date);
                if ("credit".equalsIgnoreCase(type)) {
                    tvTx1Icon.setText("↑");
                    tvTx1Icon.setBackgroundResource(R.color.bg_surface_accent);
                    tvTx1Icon.setTextColor(ContextCompat.getColor(this, R.color.success));
                    tvTx1Amount.setText("+ €" + dfTx.format(amount));
                    tvTx1Amount.setTextColor(ContextCompat.getColor(this, R.color.success));
                } else {
                    tvTx1Icon.setText("↓");
                    tvTx1Icon.setBackgroundResource(R.color.danger_bg);
                    tvTx1Icon.setTextColor(ContextCompat.getColor(this, R.color.danger));
                    tvTx1Amount.setText("- €" + dfTx.format(amount));
                    tvTx1Amount.setTextColor(ContextCompat.getColor(this, R.color.danger));
                }
            }
        } else {
            layoutTx1.setVisibility(View.GONE);
        }

        // Update Tx2
        if (eventsArr.length() > 1) {
            layoutTx2.setVisibility(View.VISIBLE);
            JSONObject ev2 = eventsArr.optJSONObject(1);
            if (ev2 != null) {
                String title = ev2.optString("title", "Transaction");
                String date = ev2.optString("date", "Today");
                double amount = ev2.optDouble("amount", 0.0);
                String type = ev2.optString("type", "debit");

                tvTx2Title.setText(title);
                tvTx2Date.setText(date);
                if ("credit".equalsIgnoreCase(type)) {
                    tvTx2Icon.setText("↑");
                    tvTx2Icon.setBackgroundResource(R.color.bg_surface_accent);
                    tvTx2Icon.setTextColor(ContextCompat.getColor(this, R.color.success));
                    tvTx2Amount.setText("+ €" + dfTx.format(amount));
                    tvTx2Amount.setTextColor(ContextCompat.getColor(this, R.color.success));
                } else {
                    tvTx2Icon.setText("↓");
                    tvTx2Icon.setBackgroundResource(R.color.danger_bg);
                    tvTx2Icon.setTextColor(ContextCompat.getColor(this, R.color.danger));
                    tvTx2Amount.setText("- €" + dfTx.format(amount));
                    tvTx2Amount.setTextColor(ContextCompat.getColor(this, R.color.danger));
                }
            }
        } else {
            layoutTx2.setVisibility(View.GONE);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pollRunnable != null) {
            pollHandler.post(pollRunnable);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        pollHandler.removeCallbacks(pollRunnable);
    }

    private void launchReceiptFor(org.json.JSONObject trx) {
        Intent intent = new Intent(MainActivity.this, ReceiptActivity.class);
        intent.putExtra("CARDHOLDER_NAME", cardholderName);
        intent.putExtra("CARD_PAN", cardPAN);
        if (trx != null) {
            intent.putExtra("TX_TITLE", trx.optString("title"));
            intent.putExtra("TX_DATE", trx.optString("date"));
            intent.putExtra("TX_AMOUNT", trx.optDouble("amount"));
            intent.putExtra("TX_TYPE", trx.optString("type"));
        }
        startActivity(intent);
    }
}
