package com.example.pos.Controller;

import android.content.Context;
import com.example.pos.Model.PinModel;

public class PinController {
    private PinModel model;

    public PinController(Context context) {
        this.model = new PinModel(context);
    }

    public void addDigit(String digit) { model.addDigit(digit); }
    public void deleteDigit() { model.deleteDigit(); }
    public boolean verifyPin() { return model.verifyPin(); }
    public void reset() { model.reset(); }
    public boolean isPinComplete() { return model.isPinComplete(); }
    public String getCurrentPin() { return model.getCurrentPin(); }
}
