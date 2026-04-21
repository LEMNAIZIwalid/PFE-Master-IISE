package com.example.pos.Views;

import android.os.Bundle;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.ProfileController;
import com.example.pos.R;

public class ProfileActivity extends AppCompatActivity {
    private ProfileController controller;
    private EditText etPosName, etRole;
    private TextView tvPosId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        controller = new ProfileController(this);

        // Find Views
        tvPosId = findViewById(R.id.tvPosIdDisplay);
        etPosName = findViewById(R.id.etPosName);
        etRole = findViewById(R.id.etRole);

        // Set Initial Data
        tvPosId.setText("1001954");
        etPosName.setText(controller.getPosName());
        etRole.setText(controller.getRole());

        // Save Logic (Top-right Checkmark)
        findViewById(R.id.btnSaveCheck).setOnClickListener(v -> {
            String newName = etPosName.getText().toString();
            String newRole = etRole.getText().toString();

            if (newName.isEmpty() || newRole.isEmpty()) {
                Toast.makeText(this, "Fields cannot be empty", Toast.LENGTH_SHORT).show();
                return;
            }

            controller.updateProfile(this, newName, newRole);

            Toast.makeText(this, "Profile Saved", Toast.LENGTH_SHORT).show();
            
            // Clear focus to hide cursor
            etPosName.clearFocus();
            etRole.clearFocus();
        });

        // Back button
        findViewById(R.id.btnProfileBack).setOnClickListener(v -> finish());
    }
}
