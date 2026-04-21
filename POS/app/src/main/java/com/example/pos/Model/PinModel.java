package com.example.pos.Model;

import android.content.Context;
import android.content.SharedPreferences;

public class PinModel {
    public static final String PREFS_NAME = "POS_Security_Prefs";
    public static final String KEY_PIN = "pos_pin";
    public static final String DEFAULT_PIN = "3402";

    private String correctPin;
    private String enteredPin = "";

    public PinModel(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.correctPin = prefs.getString(KEY_PIN, DEFAULT_PIN);
    }

    public String getCurrentPin() { return enteredPin; }

    public void addDigit(String digit) {
        if (enteredPin.length() < 4) enteredPin += digit;
    }

    public void deleteDigit() {
        if (enteredPin.length() > 0)
            enteredPin = enteredPin.substring(0, enteredPin.length() - 1);
    }

    public boolean verifyPin() { return enteredPin.equals(correctPin); }

    public void reset() { enteredPin = ""; }

    public boolean isPinComplete() { return enteredPin.length() == 4; }
}
