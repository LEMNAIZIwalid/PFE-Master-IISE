package com.example.pos.Controller;

import android.content.Context;
import android.content.SharedPreferences;

public class SaleOptsController {
    private static final String PREFS_NAME = "POS_SaleOpts_Prefs";
    private static final String KEY_CURRENCY = "currency";
    private static final String KEY_VAT = "vat_rate";
    private static final String KEY_TERMINAL_ID = "terminal_id";

    public static final String[] CURRENCIES = {"DH", "€", "$", "£"};

    public int getCurrencyIndex(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getInt(KEY_CURRENCY, 0);
    }

    public String getCurrency(Context context) {
        return CURRENCIES[getCurrencyIndex(context)];
    }

    public float getVatRate(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getFloat(KEY_VAT, 20.0f);
    }

    public String getTerminalId(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_TERMINAL_ID, "Caisse 01");
    }

    public void saveAll(Context context, int currencyIndex, float vatRate, String terminalId) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
               .putInt(KEY_CURRENCY, currencyIndex)
               .putFloat(KEY_VAT, vatRate)
               .putString(KEY_TERMINAL_ID, terminalId)
               .apply();
    }
}
