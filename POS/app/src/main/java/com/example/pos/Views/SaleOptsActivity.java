package com.example.pos.Views;

import android.graphics.Color;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.material.textfield.TextInputEditText;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.Controller.SaleOptsController;
import com.example.pos.R;

public class SaleOptsActivity extends AppCompatActivity {

    private SaleOptsController controller;
    private TextInputEditText etVat;

    // Currency toggle views
    private LinearLayout btnCurrencyMAD, btnCurrencyEuro, btnCurrencyDollar;
    private TextView tvMADSymbol, tvMADLabel;
    private TextView tvEuroSymbol, tvEuroLabel;
    private TextView tvDollarSymbol, tvDollarLabel;

    // 0=MAD, 1=Euro, 2=Dollar
    private int selectedCurrency = 0;

    private int COLOR_SELECTED_BG;
    private int COLOR_SELECTED_TXT;
    private int COLOR_UNSELECTED_TXT;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sale_opts);

        controller = new SaleOptsController();

        // Resolve dynamic colors
        COLOR_SELECTED_BG = androidx.core.content.ContextCompat.getColor(this, R.color.brand_blue);
        COLOR_SELECTED_TXT = androidx.core.content.ContextCompat.getColor(this, R.color.text_on_brand);
        COLOR_UNSELECTED_TXT = androidx.core.content.ContextCompat.getColor(this, R.color.brand_blue);

        // VAT field
        etVat = findViewById(R.id.etVat);
        etVat.setText(String.valueOf(controller.getVatRate(this)));

        // Currency buttons
        btnCurrencyMAD    = findViewById(R.id.btnCurrencyMAD);
        btnCurrencyEuro   = findViewById(R.id.btnCurrencyEuro);
        btnCurrencyDollar = findViewById(R.id.btnCurrencyDollar);

        tvMADSymbol   = findViewById(R.id.tvMADSymbol);
        tvMADLabel    = findViewById(R.id.tvMADLabel);
        tvEuroSymbol  = findViewById(R.id.tvEuroSymbol);
        tvEuroLabel   = findViewById(R.id.tvEuroLabel);
        tvDollarSymbol = findViewById(R.id.tvDollarSymbol);
        tvDollarLabel  = findViewById(R.id.tvDollarLabel);

        // Restore saved currency
        selectedCurrency = controller.getCurrencyIndex(this);
        updateCurrencyUI();

        // Click listeners
        btnCurrencyMAD.setOnClickListener(v -> { selectedCurrency = 0; updateCurrencyUI(); });
        btnCurrencyEuro.setOnClickListener(v -> { selectedCurrency = 1; updateCurrencyUI(); });
        btnCurrencyDollar.setOnClickListener(v -> { selectedCurrency = 2; updateCurrencyUI(); });

        // Save
        findViewById(R.id.btnSaveSaleOpts).setOnClickListener(v -> {
            String vatStr = etVat.getText() != null ? etVat.getText().toString() : "0";
            float vat;
            try { vat = Float.parseFloat(vatStr); } catch (Exception e) { vat = 0; }
            controller.saveAll(this, selectedCurrency, vat, "");
            Toast.makeText(this, "✅ Sale settings saved", Toast.LENGTH_SHORT).show();
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }

    private void updateCurrencyUI() {
        // Reset all to unselected
        setUnselected(btnCurrencyMAD,    tvMADSymbol,    tvMADLabel,    R.drawable.currency_unselected_bg);
        setUnselected(btnCurrencyEuro,   tvEuroSymbol,   tvEuroLabel,   R.drawable.currency_unselected_bg);
        setUnselected(btnCurrencyDollar, tvDollarSymbol, tvDollarLabel, R.drawable.currency_unselected_bg);

        // Set selected
        switch (selectedCurrency) {
            case 0: setSelected(btnCurrencyMAD,    tvMADSymbol,    tvMADLabel);    break;
            case 1: setSelected(btnCurrencyEuro,   tvEuroSymbol,   tvEuroLabel);   break;
            case 2: setSelected(btnCurrencyDollar, tvDollarSymbol, tvDollarLabel); break;
        }
    }

    private void setSelected(LinearLayout btn, TextView symbol, TextView label) {
        btn.setBackgroundResource(R.drawable.currency_selected_bg);
        symbol.setTextColor(COLOR_SELECTED_TXT);
        label.setTextColor(COLOR_SELECTED_TXT);
    }

    private void setUnselected(LinearLayout btn, TextView symbol, TextView label, int drawableRes) {
        btn.setBackgroundResource(drawableRes);
        symbol.setTextColor(COLOR_UNSELECTED_TXT);
        label.setTextColor(COLOR_UNSELECTED_TXT);
    }
}
