package com.example.pos.Views;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class ManualActivity extends AppCompatActivity {

    private TextView tvResult, tvExpression;
    private StringBuilder currentInput = new StringBuilder();
    private String expression = "";
    private double firstOperand = 0;
    private String pendingOperator = "";
    private boolean freshResult = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manual);

        tvResult = findViewById(R.id.tvResult);
        tvExpression = findViewById(R.id.tvExpression);

        // Back
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // Number buttons
        int[] numIds = {R.id.btn0, R.id.btn1, R.id.btn2, R.id.btn3, R.id.btn4,
                        R.id.btn5, R.id.btn6, R.id.btn7, R.id.btn8, R.id.btn9};
        String[] nums = {"0","1","2","3","4","5","6","7","8","9"};
        for (int i = 0; i < numIds.length; i++) {
            final String digit = nums[i];
            findViewById(numIds[i]).setOnClickListener(v -> appendDigit(digit));
        }

        // Operators
        findViewById(R.id.btnAdd).setOnClickListener(v -> setOperator("+"));
        findViewById(R.id.btnSubtract).setOnClickListener(v -> setOperator("−"));
        findViewById(R.id.btnMultiply).setOnClickListener(v -> setOperator("×"));

        // Equals
        findViewById(R.id.btnEquals).setOnClickListener(v -> calculate());

        // Delete (backspace)
        findViewById(R.id.btnDelete).setOnClickListener(v -> deleteLast());

        // Clear
        findViewById(R.id.btnClear).setOnClickListener(v -> clearAll());
    }

    private void appendDigit(String digit) {
        if (freshResult) {
            currentInput.setLength(0);
            freshResult = false;
        }
        currentInput.append(digit);
        tvResult.setText(currentInput.toString());
    }

    private void setOperator(String op) {
        if (currentInput.length() == 0) return;
        firstOperand = Double.parseDouble(currentInput.toString());
        expression = formatNumber(firstOperand) + " " + op;
        tvExpression.setText(expression);
        pendingOperator = op;
        currentInput.setLength(0);
        freshResult = false;
    }

    private void calculate() {
        if (pendingOperator.isEmpty() || currentInput.length() == 0) return;
        double secondOperand = Double.parseDouble(currentInput.toString());
        double result = 0;
        switch (pendingOperator) {
            case "+": result = firstOperand + secondOperand; break;
            case "−": result = firstOperand - secondOperand; break;
            case "×": result = firstOperand * secondOperand; break;
        }
        expression = expression + " " + formatNumber(secondOperand) + " =";
        tvExpression.setText(expression);
        tvResult.setText(formatNumber(result));
        currentInput.setLength(0);
        currentInput.append(formatNumber(result));
        pendingOperator = "";
        firstOperand = result;
        freshResult = true;
    }

    private void deleteLast() {
        if (currentInput.length() > 0) {
            currentInput.deleteCharAt(currentInput.length() - 1);
            tvResult.setText(currentInput.length() == 0 ? "0" : currentInput.toString());
        }
    }

    private void clearAll() {
        currentInput.setLength(0);
        expression = "";
        firstOperand = 0;
        pendingOperator = "";
        freshResult = false;
        tvResult.setText("0");
        tvExpression.setText("");
    }

    private String formatNumber(double value) {
        if (value == (long) value) {
            return String.valueOf((long) value);
        } else {
            return String.valueOf(value);
        }
    }
}
