package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.widget.SwitchCompat;
import com.example.pos.R;

public class ProfileActivity extends AppCompatActivity {

    private boolean isRIBVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        // Back button
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // ── Change Password (direct to reset, no email/phone step) ──
        LinearLayout rowChangePassword = findViewById(R.id.rowChangePassword);
        rowChangePassword.setOnClickListener(v -> {
            Intent intent = new Intent(ProfileActivity.this, ResetPasswordActivity.class);
            startActivity(intent);
        });

        // ── Theme Toggle ─────────────────────────────────────────────
        SwitchCompat switchDarkMode = findViewById(R.id.switchDarkMode);
        TextView tvCurrentTheme = findViewById(R.id.tvCurrentTheme);

        // Restore current mode state on the switch
        boolean isDark = (getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
        switchDarkMode.setChecked(isDark);
        tvCurrentTheme.setText(isDark ? "Dark Mode (current)" : "Light Mode (current)");

        switchDarkMode.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                tvCurrentTheme.setText("Dark Mode (current)");
                androidx.appcompat.app.AppCompatDelegate
                        .setDefaultNightMode(androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES);
            } else {
                tvCurrentTheme.setText("Light Mode (current)");
                androidx.appcompat.app.AppCompatDelegate
                        .setDefaultNightMode(androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO);
            }
        });

        // ── RIB ──────────────────────────────────────────────────────
        LinearLayout rowDownloadRIB = findViewById(R.id.rowDownloadRIB);
        LinearLayout cardRIB = findViewById(R.id.cardRIB);

        rowDownloadRIB.setOnClickListener(v -> {
            isRIBVisible = !isRIBVisible;
            cardRIB.setVisibility(isRIBVisible ? View.VISIBLE : View.GONE);
        });

        Button btnDownloadRIB = findViewById(R.id.btnDownloadRIB);
        btnDownloadRIB.setOnClickListener(v -> {
            // Simulate PDF generation / download
            Toast.makeText(this,
                "✅ Your RIB has been saved to your Downloads folder.",
                Toast.LENGTH_LONG).show();
        });

        // ── Sign Out ──────────────────────────────────────────────────
        LinearLayout rowLogout = findViewById(R.id.rowLogout);
        rowLogout.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out of your account?")
                .setPositiveButton("Sign Out", (dialog, which) -> {
                    Intent intent = new Intent(ProfileActivity.this, LoginActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    finish();
                })
                .setNegativeButton("Cancel", null)
                .show();
        });
    }
}
