package com.example.pos.Views;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

public class TransferActivity extends AppCompatActivity {

    private EditText etRecipient, etFirstName, etLastName, etAmount, etJustification;
    private Button btnSendTransfer;
    private TextView tvError;
    private String senderCardId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_transfer);

        // Retrieve CARD_ID from intent extras
        senderCardId = getIntent().getStringExtra("CARD_ID");

        // Initialize views
        etRecipient = findViewById(R.id.etRecipient);
        etFirstName = findViewById(R.id.etFirstName);
        etLastName = findViewById(R.id.etLastName);
        etAmount = findViewById(R.id.etAmount);
        etJustification = findViewById(R.id.etJustification);
        btnSendTransfer = findViewById(R.id.btnSendTransfer);
        tvError = findViewById(R.id.tvError);

        // Back button
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // Send transfer logic
        btnSendTransfer.setOnClickListener(v -> {
            String recipient = etRecipient.getText().toString().trim();
            String firstName = etFirstName.getText().toString().trim();
            String lastName = etLastName.getText().toString().trim();
            String amount = etAmount.getText().toString().trim();
            String justification = etJustification.getText().toString().trim();

            if (recipient.isEmpty() || firstName.isEmpty() || lastName.isEmpty() || amount.isEmpty()) {
                showError("Please enter recipient PAN, first name, last name, and amount.");
                return;
            }

            if (senderCardId == null || senderCardId.trim().isEmpty()) {
                showError("Error: Sender account not identified.");
                return;
            }

            // Confirm dialog
            new AlertDialog.Builder(this)
                .setTitle("Confirm Transfer")
                .setMessage("Are you sure you want to send €" + amount + " to " + firstName + " " + lastName + " (" + recipient + ")?")
                .setPositiveButton("Confirm", (dialog, which) -> {
                    performTransfer(recipient, firstName, lastName, amount);
                })
                .setNegativeButton("Cancel", null)
                .show();
        });
    }

    private void performTransfer(String recipientPan, String firstName, String lastName, String amountStr) {
        tvError.setVisibility(View.GONE);
        btnSendTransfer.setEnabled(false);

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("http://10.0.2.2:5001/api/mobile/transfer");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                JSONObject jsonParam = new JSONObject();
                jsonParam.put("sender_card_id", senderCardId);
                jsonParam.put("recipient_pan", recipientPan);
                jsonParam.put("recipient_first_name", firstName);
                jsonParam.put("recipient_last_name", lastName);
                jsonParam.put("amount", amountStr);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonParam.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                StringBuilder response = new StringBuilder();
                if (is != null) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"))) {
                        String line;
                        while ((line = br.readLine()) != null) {
                            response.append(line.trim());
                        }
                    }
                }

                JSONObject responseJson = new JSONObject(response.toString());
                String message = responseJson.optString("message", "An error occurred during transfer.");

                runOnUiThread(() -> {
                    btnSendTransfer.setEnabled(true);
                    if (code == 200) {
                        Toast.makeText(TransferActivity.this, "✅ " + message, Toast.LENGTH_LONG).show();
                        finish();
                    } else {
                        // Check if it's a validation error
                        if (code == 404) {
                            showError("Invalid user: " + message);
                        } else {
                            showError(message);
                        }
                    }
                });

            } catch (Exception e) {
                runOnUiThread(() -> {
                    btnSendTransfer.setEnabled(true);
                    showError("Connection error: " + e.getMessage());
                });
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }

    private void showError(String message) {
        tvError.setText(message);
        tvError.setVisibility(View.VISIBLE);
    }
}
