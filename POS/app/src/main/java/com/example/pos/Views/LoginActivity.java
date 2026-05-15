package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class LoginActivity extends AppCompatActivity {

    private EditText etUsername, etPassword;
    private Button btnLogin;
    private TextView tvForgotPassword;

    private static final String VALID_USER = "bankclient";
    private static final String VALID_PASS = "133016";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        etUsername     = findViewById(R.id.etUsername);
        etPassword     = findViewById(R.id.etPassword);
        btnLogin       = findViewById(R.id.btnLogin);
        tvForgotPassword = findViewById(R.id.tvForgotPassword);

        btnLogin.setOnClickListener(v -> {
            String user = etUsername.getText().toString().trim();
            String pass = etPassword.getText().toString().trim();

            if (user.isEmpty() || pass.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields.", Toast.LENGTH_SHORT).show();
                return;
            }

            if (user.equals(VALID_USER) && pass.equals(VALID_PASS)) {
                Toast.makeText(this, "Welcome, " + VALID_USER + "!", Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                startActivity(intent);
                finish();
            } else {
                Toast.makeText(this, "Invalid username or password.", Toast.LENGTH_LONG).show();
            }
        });

        tvForgotPassword.setOnClickListener(v ->
            Toast.makeText(this, "Please contact your local branch for support.", Toast.LENGTH_LONG).show()
        );
    }
}
