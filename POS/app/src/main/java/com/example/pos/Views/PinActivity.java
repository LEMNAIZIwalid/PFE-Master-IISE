package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.PinController;
import com.example.pos.R;

public class PinActivity extends AppCompatActivity {
    private PinController controller;
    private TextView[] pinBoxes;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pin);

        controller = new PinController(this);

        // Initialize PIN boxes
        pinBoxes = new TextView[]{
            findViewById(R.id.tvPin1),
            findViewById(R.id.tvPin2),
            findViewById(R.id.tvPin3),
            findViewById(R.id.tvPin4)
        };

        // Set up keypad listeners
        setupKeypad();

        // Back button
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // Verify button
        findViewById(R.id.btnVerify).setOnClickListener(v -> {
            if (controller.isPinComplete()) {
                if (controller.verifyPin()) {
                    Intent intent = new Intent(PinActivity.this, HomeActivity.class);
                    startActivity(intent);
                    finish();
                } else {
                    // Start error feedback
                    triggerErrorFeedback();
                }
            } else {
                Toast.makeText(this, "Please enter 4 digits", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void triggerErrorFeedback() {
        // Change backgrounds to red border
        for (TextView box : pinBoxes) {
            box.setBackgroundResource(R.drawable.pin_box_error);
        }

        // Start shake animation
        android.view.animation.Animation shake = android.view.animation.AnimationUtils.loadAnimation(this, R.anim.shake);
        findViewById(R.id.layoutPinBoxes).startAnimation(shake);

        // Reset after 1 second
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            for (TextView box : pinBoxes) {
                box.setBackgroundResource(R.drawable.pin_box_background);
            }
            controller.reset();
            updatePinDisplay();
        }, 1000);
    }

    private void setupKeypad() {
        View.OnClickListener listener = v -> {
            if (v instanceof Button) {
                String digit = ((Button) v).getText().toString();
                controller.addDigit(digit);
                updatePinDisplay();
            }
        };

        // Find and set listeners for 0-9
        int[] numIds = {
            R.id.numpad // I realized I should have given IDs to individual buttons or loop through the GridLayout
        };
        // Re-correcting: I'll loop through the numpad siblings
        android.widget.GridLayout grid = findViewById(R.id.numpad);
        for (int i = 0; i < grid.getChildCount(); i++) {
            View child = grid.getChildAt(i);
            if (child instanceof Button) {
                child.setOnClickListener(listener);
            }
        }

        // Delete button
        findViewById(R.id.btnDelete).setOnClickListener(v -> {
            controller.deleteDigit();
            updatePinDisplay();
        });
    }

    private void updatePinDisplay() {
        String pin = controller.getCurrentPin();
        for (int i = 0; i < pinBoxes.length; i++) {
            if (i < pin.length()) {
                pinBoxes[i].setText("•"); // Or display the digit itself if you prefer
            } else {
                pinBoxes[i].setText("");
            }
        }
    }
}
