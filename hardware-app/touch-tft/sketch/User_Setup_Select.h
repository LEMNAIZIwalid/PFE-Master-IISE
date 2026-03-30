// User_Setup_Select.h - Version corrigée pour inclusion locale

#ifndef USER_SETUP_LOADED

///////////////////////////////////////////////////////
//   User configuration selection lines are below    //
///////////////////////////////////////////////////////

// UTILISATION IMPÉRATIVE DES GUILLEMETS ""
#include "User_Setup.h"           

#endif // USER_SETUP_LOADED

/////////////////////////////////////////////////////////////////////////////////////
//      DON'T TINKER WITH ANY OF THE FOLLOWING LINES, THESE ADD THE TFT DRIVERS    //
/////////////////////////////////////////////////////////////////////////////////////

#define TFT_BGR 0
#define TFT_RGB 1

#if defined (RPI_DRIVER)
  #if !defined (RPI_DISPLAY_TYPE)
    #define RPI_DISPLAY_TYPE
  #endif
#endif

#if defined (RPI_ILI9486_DRIVER)
  #if !defined (ILI9486_DRIVER)
    #define ILI9486_DRIVER
  #endif
  #if !defined (RPI_DISPLAY_TYPE)
    #define RPI_DISPLAY_TYPE
  #endif
#endif

// Load the right driver definition
#if   defined (ILI9341_DRIVER) || defined(ILI9341_2_DRIVER) || defined (ILI9342_DRIVER)
     #include "ILI9341_Defines.h"
     #define  TFT_DRIVER 0x9341
#elif defined (ST7735_DRIVER)
     #include "ST7735_Defines.h"
     #define  TFT_DRIVER 0x7735
#elif defined (ST7796_DRIVER)
      // Correction driver ST7796
      #include "ST7796_Defines.h"
      #define  TFT_DRIVER 0x7796
#elif defined (ILI9488_DRIVER)
     #include "ILI9488_Defines.h"
     #define  TFT_DRIVER 0x9488
#elif defined (ST7789_DRIVER)
     #include "ST7789_Defines.h"
     #define  TFT_DRIVER 0x7789
#else
     #define  TFT_DRIVER 0x0000
#endif

// Définitions des Pins pour ESP8266 (À vérifier selon votre câblage)
#define PIN_D0  16
#define PIN_D1   5
#define PIN_D2   4
#define PIN_D3   0
#define PIN_D4   2
#define PIN_D5  14
#define PIN_D6  12
#define PIN_D7  13
#define PIN_D8  15
#define PIN_D9   3
#define PIN_D10  1

#define PIN_MOSI 8
#define PIN_MISO 7
#define PIN_SCLK 6
#define PIN_HWCS 0