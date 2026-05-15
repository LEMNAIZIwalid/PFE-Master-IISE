package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class ForgotPasswordActivity extends AppCompatActivity {

    private EditText etEmail, etPhone;
    private Button btnVerify;
    private TextView tvError, tvBackToLogin;

    // Expected credentials for identity verification
    private static final String REGISTERED_EMAIL = "client@gmail.com";
    private static final String REGISTERED_PHONE = "0611223344";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);

        etEmail = findViewById(R.id.etEmail);
        etPhone = findViewById(R.id.etPhone);
        btnVerify = findViewById(R.id.btnVerify);
        tvError = findViewById(R.id.tvError);
        tvBackToLogin = findViewById(R.id.tvBackToLogin);

        btnVerify.setOnClickListener(v -> {
            String email = etEmail.getText().toString().trim();
            String phone = etPhone.getText().toString().trim();

            if (email.isEmpty() || phone.isEmpty()) {
                showError("Please fill in all fields.");
                return;
            }

            if (email.equals(REGISTERED_EMAIL) && phone.equals(REGISTERED_PHONE)) {
                // Identity verified → proceed to password reset
                Intent intent = new Intent(ForgotPasswordActivity.this, ResetPasswordActivity.class);
                startActivity(intent);
                finish();
            } else {
                showError("The information you entered does not match our records.");
            }
        });

        tvBackToLogin.setOnClickListener(v -> finish());
    }

    private void showError(String message) {
        tvError.setText(message);
        tvError.setVisibility(View.VISIBLE);
    }
}
