package com.example.pos.Views;

import android.os.Bundle;
import android.view.animation.AlphaAnimation;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.WelcomeController;
import com.example.pos.R;

public class WelcomeActivity extends AppCompatActivity {
    private WelcomeController controller;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_welcome);

        // Initialize Controller
        controller = new WelcomeController();

        // Find View
        TextView tvWelcome = findViewById(R.id.tvWelcome);

        // Set Data from Controller
        tvWelcome.setText(controller.getWelcomeMessage());

        // Add a premium fade-in animation
        AlphaAnimation fadeIn = new AlphaAnimation(0.0f, 1.0f);
        fadeIn.setDuration(1500);
        fadeIn.setFillAfter(true);
        tvWelcome.startAnimation(fadeIn);

        // Click listener to start PinActivity
        findViewById(R.id.cvWelcome).setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(WelcomeActivity.this, PinActivity.class);
            startActivity(intent);
        });
    }
}
