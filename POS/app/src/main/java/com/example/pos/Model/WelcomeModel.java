package com.example.pos.Model;

public class WelcomeModel {
    private String welcomeMessage;

    public WelcomeModel() {
        this.welcomeMessage = "WELCOME POS";
    }

    public String getWelcomeMessage() {
        return welcomeMessage;
    }

    public void setWelcomeMessage(String welcomeMessage) {
        this.welcomeMessage = welcomeMessage;
    }
}
