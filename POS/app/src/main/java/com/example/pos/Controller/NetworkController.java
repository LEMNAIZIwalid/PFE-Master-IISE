package com.example.pos.Controller;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.provider.Settings;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;

public class NetworkController {

    public String getWifiSSID(Context context) {
        WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wifiManager == null || !wifiManager.isWifiEnabled()) return "Wi-Fi désactivé";
        WifiInfo info = wifiManager.getConnectionInfo();
        if (info == null) return "Non connecté";
        String ssid = info.getSSID();
        return ssid.replace("\"", "");
    }

    public String getIpAddress(Context context) {
        WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wifiManager == null) return "N/A";
        int ipInt = wifiManager.getConnectionInfo().getIpAddress();
        if (ipInt == 0) return "Non connecté";
        return (ipInt & 0xFF) + "." + ((ipInt >> 8) & 0xFF) + "." + ((ipInt >> 16) & 0xFF) + "." + ((ipInt >> 24) & 0xFF);
    }

    public int getSignalLevel(Context context) {
        WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wifiManager == null) return 0;
        int rssi = wifiManager.getConnectionInfo().getRssi();
        return WifiManager.calculateSignalLevel(rssi, 5); // 0-4
    }

    public boolean isWifiConnected(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected() && info.getType() == ConnectivityManager.TYPE_WIFI;
    }

    public boolean isAirplaneModeOn(Context context) {
        return Settings.Global.getInt(context.getContentResolver(), Settings.Global.AIRPLANE_MODE_ON, 0) != 0;
    }

    /** Checks TCP connection to bridge host. Run on background thread. */
    public boolean pingBridge(String host, int port, int timeoutMs) {
        try {
            Socket socket = new Socket();
            SocketAddress addr = new InetSocketAddress(host, port);
            socket.connect(addr, timeoutMs);
            socket.close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
