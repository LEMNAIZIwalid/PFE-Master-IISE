package com.example.pos.Views;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class TransferActivity extends AppCompatActivity {

    private EditText etRecipient, etAmount, etJustification;
    private Button btnSendTransfer;
    private TextView tvError;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_transfer);

        // Initialize views
        etRecipient = findViewById(R.id.etRecipient);
        etAmount = findViewById(R.id.etAmount);
        etJustification = findViewById(R.id.etJustification);
        btnSendTransfer = findViewById(R.id.btnSendTransfer);
        tvError = findViewById(R.id.tvError);

        // Back button
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // Send transfer logic
        btnSendTransfer.setOnClickListener(v -> {
            String recipient = etRecipient.getText().toString().trim();
            String amount = etAmount.getText().toString().trim();
            String justification = etJustification.getText().toString().trim();

            if (recipient.isEmpty() || amount.isEmpty()) {
                showError("Please enter recipient and amount.");
                return;
            }

            // Confirm dialog
            new AlertDialog.Builder(this)
                .setTitle("Confirm Transfer")
                .setMessage("Are you sure you want to send €" + amount + " to " + recipient + "?")
                .setPositiveButton("Confirm", (dialog, which) -> {
                    // Success simulation
                    Toast.makeText(this, "✅ Transfer successful!", Toast.LENGTH_LONG).show();
                    finish();
                })
                .setNegativeButton("Cancel", null)
                .show();
        });
    }

    private void showError(String message) {
        tvError.setText(message);
        tvError.setVisibility(View.VISIBLE);
    }
}
