package com.example.pos.Views;

import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.SystemController;
import com.example.pos.R;

public class SystemActivity extends AppCompatActivity {
    private SystemController controller;
    private Switch switchSounds;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_system);

        controller = new SystemController();

        // Populate device info
        ((TextView) findViewById(R.id.tvVersion)).setText(controller.getAppVersion(this));
        ((TextView) findViewById(R.id.tvBattery)).setText(controller.getBatteryLevel(this) + "%");
        try {
            ((TextView) findViewById(R.id.tvStorage)).setText(controller.getAvailableStorage());
        } catch (Exception e) {
            ((TextView) findViewById(R.id.tvStorage)).setText("N/A");
        }

        // Sounds switch
        switchSounds = findViewById(R.id.switchSounds);
        switchSounds.setChecked(controller.isSoundsEnabled(this));
        switchSounds.setOnCheckedChangeListener((btn, checked) -> controller.setSoundsEnabled(this, checked));

        // Restart button
        findViewById(R.id.btnRestart).setOnClickListener(v ->
            new AlertDialog.Builder(this)
                .setTitle("Restart")
                .setMessage("Do you want to restart the POS application?")
                .setPositiveButton("Yes", (d, w) -> {
                    Intent intent = new Intent(this, WelcomeActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    finishAffinity();
                })
                .setNegativeButton("Annuler", null)
                .show()
        );

        // Factory Reset button
        findViewById(R.id.btnFactoryReset).setOnClickListener(v ->
            new AlertDialog.Builder(this)
                .setTitle("⚠️ Factory Reset")
                .setMessage("This will erase ALL settings (PIN, profile, preferences). Confirm?")
                .setPositiveButton("Reset", (d, w) ->
                    new AlertDialog.Builder(this)
                        .setTitle("Final Confirmation")
                        .setMessage("This action is irreversible. Continue?")
                        .setPositiveButton("Yes, erase", (d2, w2) -> {
                            controller.factoryReset(this);
                            Toast.makeText(this, "✅ Factory reset complete", Toast.LENGTH_LONG).show();
                            Intent intent = new Intent(this, WelcomeActivity.class);
                            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            finishAffinity();
                        })
                        .setNegativeButton("Cancel", null)
                        .show()
                )
                .setNegativeButton("Cancel", null)
                .show()
        );

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
