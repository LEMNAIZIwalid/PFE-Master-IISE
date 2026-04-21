package com.example.pos.Controller;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class HomeController {
    
    public String getFormattedDate() {
        // Format: thursday 16 / 04 / 2026
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE dd / MM / yyyy", Locale.ENGLISH);
        return sdf.format(new Date()).toLowerCase();
    }
}
