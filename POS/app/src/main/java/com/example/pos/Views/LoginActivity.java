package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {

    private EditText etUsername, etPassword;
    private Button btnLogin;
    private TextView tvForgotPassword;

    private static final String VALID_USER = "bankclient";

    // Dynamic password: starts with default 110011, can be updated via "Forgot Password"
    private static String currentPassword = "110011";

    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    /** Called by ResetPasswordActivity to update the password */
    public static void updatePassword(String newPassword) {
        currentPassword = newPassword;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        etUsername       = findViewById(R.id.etUsername);
        etPassword       = findViewById(R.id.etPassword);
        btnLogin         = findViewById(R.id.btnLogin);
        tvForgotPassword = findViewById(R.id.tvForgotPassword);

        btnLogin.setOnClickListener(v -> {
            String user = etUsername.getText().toString().trim();
            String pass = etPassword.getText().toString().trim();

            if (user.isEmpty() || pass.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Perform authentication with API check and local offline fallback
            authenticateUser(user, pass);
        });

        // Navigate to Forgot Password flow
        tvForgotPassword.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, ForgotPasswordActivity.class);
            startActivity(intent);
        });
    }

    private void authenticateUser(final String username, final String password) {
        btnLogin.setEnabled(false);
        btnLogin.setText("Connecting...");

        executorService.execute(() -> {
            HttpURLConnection conn = null;
            boolean loginSuccess = false;
            boolean serverError = false;
            String errorMessage = "Invalid username or password.";

            final String[] holderName = {""};
            final double[] balance = {0.0};
            final String[] cardPan = {""};
            final String[] cardStatus = {"Active"};
            final String[] recentEventsJson = {""};

            try {
                // Flask API running on host machine, accessed via 10.0.2.2 inside emulator
                URL url = new URL("http://10.0.2.2:5001/api/mobile/login");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(3000);

                // JSON payload
                String jsonInputString = "{\"username\": \"" + username + "\", \"password\": \"" + password + "\"}";

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonInputString.getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    InputStream is = conn.getInputStream();
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"))) {
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) {
                            response.append(line.trim());
                        }
                        JSONObject jsonObj = new JSONObject(response.toString());
                        String fName = jsonObj.optString("f_name", "");
                        String lName = jsonObj.optString("l_name", "");
                        holderName[0] = (fName + " " + lName).trim();
                        if (holderName[0].isEmpty()) {
                            holderName[0] = username;
                        }
                        balance[0] = jsonObj.optDouble("amount", 0.0);
                        cardPan[0] = jsonObj.optString("pan", "xxxx  xxxx  xxxx  xxxx");
                        cardStatus[0] = jsonObj.optString("card_status", "Active");
                        org.json.JSONArray eventsArr = jsonObj.optJSONArray("recent_events");
                        if (eventsArr != null) {
                            recentEventsJson[0] = eventsArr.toString();
                        } else {
                            recentEventsJson[0] = "";
                        }
                        loginSuccess = true;
                    }
                } else {
                    InputStream es = conn.getErrorStream();
                    if (es != null) {
                        try (BufferedReader br = new BufferedReader(new InputStreamReader(es, "utf-8"))) {
                            StringBuilder response = new StringBuilder();
                            String line;
                            while ((line = br.readLine()) != null) {
                                response.append(line.trim());
                            }
                            String resp = response.toString();
                            if (resp.contains("\"message\"")) {
                                int index = resp.indexOf("\"message\"");
                                int start = resp.indexOf("\"", index + 10);
                                int startQuote = resp.indexOf("\"", start + 1);
                                if (start != -1 && startQuote != -1) {
                                    errorMessage = resp.substring(start + 1, startQuote);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // Server is down or unreachable
                serverError = true;
                errorMessage = "Connection error: " + e.getMessage();
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }

            final boolean finalSuccess = loginSuccess;
            final boolean finalServerError = serverError;
            final String finalError = errorMessage;

            runOnUiThread(() -> {
                btnLogin.setEnabled(true);
                btnLogin.setText("SIGN IN");

                if (finalSuccess) {
                    Toast.makeText(LoginActivity.this, "Welcome, " + holderName[0] + "!", Toast.LENGTH_SHORT).show();
                    Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                    intent.putExtra("CARDHOLDER_NAME", holderName[0]);
                    intent.putExtra("CARD_ID", username);
                    intent.putExtra("CARD_BALANCE", balance[0]);
                    intent.putExtra("CARD_PAN", cardPan[0]);
                    intent.putExtra("CARD_STATUS", cardStatus[0]);
                    intent.putExtra("RECENT_EVENTS_JSON", recentEventsJson[0]);
                    startActivity(intent);
                    finish();
                } else if (finalServerError) {
                    // Fallback to offline mode for seamless testing
                    if (password.equals(currentPassword) || password.equals("110011")) {
                        if (username.equals(VALID_USER)) {
                            holderName[0] = "Bank Client";
                            balance[0] = 2450.75;
                            cardPan[0] = "xxxx  xxxx  8842  9173";
                            cardStatus[0] = "Active";
                        } else {
                            holderName[0] = "Cardholder " + username;
                            balance[0] = 750.00;
                            cardPan[0] = "xxxx  xxxx  xxxx  " + (username.length() > 4 ? username.substring(username.length() - 4) : username);
                            cardStatus[0] = "Active";
                        }

                        Toast.makeText(LoginActivity.this, "Offline Mode: Local authentication successful.", Toast.LENGTH_LONG).show();
                        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                        intent.putExtra("CARDHOLDER_NAME", holderName[0]);
                        intent.putExtra("CARD_ID", username);
                        intent.putExtra("CARD_BALANCE", balance[0]);
                        intent.putExtra("CARD_PAN", cardPan[0]);
                        intent.putExtra("CARD_STATUS", cardStatus[0]);
                        String fallbackEvents = "[{\"title\":\"External Transfer Received\",\"date\":\"Today, 09:15\",\"amount\":500.0,\"type\":\"credit\"}," +
                                "{\"title\":\"Balance Withdrawal\",\"date\":\"Yesterday, 14:32\",\"amount\":150.0,\"type\":\"debit\"}]";
                        intent.putExtra("RECENT_EVENTS_JSON", fallbackEvents);
                        startActivity(intent);
                        finish();
                    } else {
                        Toast.makeText(LoginActivity.this, "Incorrect password (Offline Mode).", Toast.LENGTH_LONG).show();
                    }
                } else {
                    // Rejected by API
                    Toast.makeText(LoginActivity.this, finalError, Toast.LENGTH_LONG).show();
                }
            });
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executorService.shutdown();
    }
}
