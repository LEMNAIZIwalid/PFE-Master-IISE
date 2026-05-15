package com.example.pos.Views;

import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Profile button
        findViewById(R.id.btnProfile).setOnClickListener(v ->
            Toast.makeText(this, "Profile — Coming soon", Toast.LENGTH_SHORT).show()
        );

        // Transfer button
        findViewById(R.id.btnTransfer).setOnClickListener(v ->
            Toast.makeText(this, "Transfer — Coming soon", Toast.LENGTH_SHORT).show()
        );

        // History button
        findViewById(R.id.btnHistory).setOnClickListener(v ->
            Toast.makeText(this, "History — Coming soon", Toast.LENGTH_SHORT).show()
        );

        // Receipt button
        findViewById(R.id.btnReceipt).setOnClickListener(v ->
            Toast.makeText(this, "Receipt — Coming soon", Toast.LENGTH_SHORT).show()
        );
    }
}
