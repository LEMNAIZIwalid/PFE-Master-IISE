package com.example.pos.Views;

import android.os.Bundle;
import android.widget.Switch;
import android.widget.Toast;
import com.google.android.material.textfield.TextInputEditText;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.SecurityController;
import com.example.pos.R;

public class SecurityActivity extends AppCompatActivity {
    private SecurityController controller;
    private TextInputEditText etCurrentPin, etNewPin, etConfirmPin;
    private Switch switchAutoLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_security);

        controller = new SecurityController();
        etCurrentPin = findViewById(R.id.etCurrentPin);
        etNewPin = findViewById(R.id.etNewPin);
        etConfirmPin = findViewById(R.id.etConfirmPin);
        switchAutoLock = findViewById(R.id.switchAutoLock);

        // Load auto-lock state
        switchAutoLock.setChecked(controller.isAutoLockEnabled(this));

        // Auto-lock toggle
        switchAutoLock.setOnCheckedChangeListener((btn, isChecked) ->
                controller.setAutoLock(this, isChecked));

        // Save PIN
        findViewById(R.id.btnSavePin).setOnClickListener(v -> {
            String current = etCurrentPin.getText() != null ? etCurrentPin.getText().toString() : "";
            String newPin = etNewPin.getText() != null ? etNewPin.getText().toString() : "";
            String confirm = etConfirmPin.getText() != null ? etConfirmPin.getText().toString() : "";

            String error = controller.saveNewPin(this, current, newPin, confirm);
            if (error == null) {
                Toast.makeText(this, "✅ PIN updated successfully", Toast.LENGTH_SHORT).show();
                etCurrentPin.setText("");
                etNewPin.setText("");
                etConfirmPin.setText("");
            } else {
                Toast.makeText(this, "❌ " + error, Toast.LENGTH_SHORT).show();
            }
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
