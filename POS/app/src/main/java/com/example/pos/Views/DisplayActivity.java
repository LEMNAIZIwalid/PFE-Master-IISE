package com.example.pos.Views;

import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.DisplayController;
import com.example.pos.R;

public class DisplayActivity extends AppCompatActivity {
    private DisplayController controller;
    private SeekBar seekBrightness;
    private Switch switchDarkMode;
    private Spinner spinnerSleep;
    private TextView tvBrightnessValue;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_display);

        controller = new DisplayController();
        seekBrightness = findViewById(R.id.seekBrightness);
        switchDarkMode = findViewById(R.id.switchDarkMode);
        spinnerSleep = findViewById(R.id.spinnerSleep);
        tvBrightnessValue = findViewById(R.id.tvBrightnessValue);

        // Load saved values
        int brightness = controller.getBrightness(this);
        seekBrightness.setProgress(brightness);
        tvBrightnessValue.setText((brightness * 100 / 255) + "%");
        switchDarkMode.setChecked(controller.isDarkMode(this));
        spinnerSleep.setSelection(controller.getSleepIndex(this));

        // Live brightness label update
        seekBrightness.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int progress, boolean fromUser) {
                tvBrightnessValue.setText((progress * 100 / 255) + "%");
                // Apply brightness to current window
                Window window = getWindow();
                WindowManager.LayoutParams lp = window.getAttributes();
                lp.screenBrightness = progress / 255.0f;
                window.setAttributes(lp);
            }
            @Override public void onStartTrackingTouch(SeekBar s) {}
            @Override public void onStopTrackingTouch(SeekBar s) {}
        });

        // Save button
        findViewById(R.id.btnSaveDisplay).setOnClickListener(v -> {
            int b = seekBrightness.getProgress();
            boolean dark = switchDarkMode.isChecked();
            int sleep = spinnerSleep.getSelectedItemPosition();
            controller.saveAll(this, b, dark, sleep);

            // Apply dark/light mode
            AppCompatDelegate.setDefaultNightMode(dark
                    ? AppCompatDelegate.MODE_NIGHT_YES
                    : AppCompatDelegate.MODE_NIGHT_NO);

            Toast.makeText(this, "✅ Display settings saved", Toast.LENGTH_SHORT).show();
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
