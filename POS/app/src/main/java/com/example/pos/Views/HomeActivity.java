package com.example.pos.Views;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.HomeController;
import com.example.pos.R;

public class HomeActivity extends AppCompatActivity {
    private HomeController controller;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);

        controller = new HomeController();

        // Set Dynamic Date
        TextView tvDate = findViewById(R.id.tvHomeDate);
        if (tvDate != null) {
            tvDate.setText(controller.getFormattedDate());
        }

        // Back button
        findViewById(R.id.btnHomeBack).setOnClickListener(v -> finish());

        // Navigations
        findViewById(R.id.btnSettings).setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(HomeActivity.this, SettingsActivity.class);
            startActivity(intent);
        });

        findViewById(R.id.btnSale).setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(HomeActivity.this, SaleActivity.class);
            startActivity(intent);
        });

        findViewById(R.id.btnProfile).setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(HomeActivity.this, ProfileActivity.class);
            startActivity(intent);
        });
    }
}
