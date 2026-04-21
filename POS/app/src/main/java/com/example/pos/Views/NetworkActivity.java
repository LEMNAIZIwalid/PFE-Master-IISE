package com.example.pos.Views;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.NetworkController;
import com.example.pos.R;

public class NetworkActivity extends AppCompatActivity {
    private NetworkController controller;
    private TextView tvSsid, tvIpAddress, tvSignal, tvAirplaneStatus, tvBridgeStatus;
    private View viewBridgeDot;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_network);

        controller = new NetworkController();
        tvSsid = findViewById(R.id.tvSsid);
        tvIpAddress = findViewById(R.id.tvIpAddress);
        tvSignal = findViewById(R.id.tvSignal);
        tvAirplaneStatus = findViewById(R.id.tvAirplaneStatus);
        tvBridgeStatus = findViewById(R.id.tvBridgeStatus);
        viewBridgeDot = findViewById(R.id.viewBridgeDot);

        // Load initial WiFi info
        refreshWifiInfo();

        // Refresh WiFi button
        findViewById(R.id.btnRefreshWifi).setOnClickListener(v -> refreshWifiInfo());

        // Open system airplane mode settings
        findViewById(R.id.btnAirplaneSettings).setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS)));

        // Test Bridge connection
        findViewById(R.id.btnTestBridge).setOnClickListener(v -> {
            tvBridgeStatus.setText("Test en cours...");
            viewBridgeDot.setBackgroundColor(Color.parseColor("#9E9E9E"));

            // Run ping on background thread
            new Thread(() -> {
                // Change bridge host/port to match your Python bridge setup
                boolean connected = controller.pingBridge("192.168.1.100", 8080, 3000);
                runOnUiThread(() -> {
                    if (connected) {
                        tvBridgeStatus.setText("✅ Bridge connected");
                        viewBridgeDot.setBackgroundColor(androidx.core.content.ContextCompat.getColor(NetworkActivity.this, R.color.success_green));
                    } else {
                        tvBridgeStatus.setText("❌ Bridge unavailable");
                        // For failure, we can parse standard color or define one, we'll parse standard red
                        viewBridgeDot.setBackgroundColor(Color.parseColor("#C62828"));
                    }
                });
            }).start();
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }

    private void refreshWifiInfo() {
        boolean airplaneOn = controller.isAirplaneModeOn(this);
        tvAirplaneStatus.setText(airplaneOn ? "⚠️ Active — Wi-Fi disabled" : "Disabled");

        if (controller.isWifiConnected(this)) {
            tvSsid.setText(controller.getWifiSSID(this));
            tvIpAddress.setText(controller.getIpAddress(this));
            int signal = controller.getSignalLevel(this);
            String[] bars = {"▂___", "▂▄__", "▂▄▆_", "▂▄▆█"};
            tvSignal.setText(signal > 0 ? bars[Math.min(signal - 1, 3)] : "Faible");
        } else {
            tvSsid.setText("Not connected");
            tvIpAddress.setText("--");
            tvSignal.setText("--");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshWifiInfo();
    }
}
