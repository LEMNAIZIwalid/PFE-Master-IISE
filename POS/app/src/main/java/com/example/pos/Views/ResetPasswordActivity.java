package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class ResetPasswordActivity extends AppCompatActivity {

    private EditText etNewPassword, etConfirmPassword;
    private Button btnResetPassword;
    private TextView tvError;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reset_password);

        etNewPassword     = findViewById(R.id.etNewPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnResetPassword  = findViewById(R.id.btnResetPassword);
        tvError           = findViewById(R.id.tvError);

        btnResetPassword.setOnClickListener(v -> {
            String newPass     = etNewPassword.getText().toString().trim();
            String confirmPass = etConfirmPassword.getText().toString().trim();

            // Validate not empty
            if (newPass.isEmpty() || confirmPass.isEmpty()) {
                showError("Please fill in both password fields.");
                return;
            }

            // Validate minimum length
            if (newPass.length() < 5) {
                showError("Password must be at least 5 characters long.");
                return;
            }

            // Validate matching
            if (!newPass.equals(confirmPass)) {
                showError("Passwords do not match. Please try again.");
                return;
            }

            // ✅ Update the password in LoginActivity
            LoginActivity.updatePassword(newPass);

            // Success feedback & navigate to Login
            Toast.makeText(this,
                "✅ Password updated successfully! Please sign in with your new password.",
                Toast.LENGTH_LONG).show();

            Intent intent = new Intent(ResetPasswordActivity.this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }

    private void showError(String message) {
        tvError.setText(message);
        tvError.setVisibility(View.VISIBLE);
    }
}
