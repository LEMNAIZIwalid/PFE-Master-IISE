#ifndef PGMSPACE_FIX_H
#define PGMSPACE_FIX_H

#include <Arduino.h>

/**
 * Ce correctif gère la compatibilité du mot-clé PROGMEM.
 * Sur les architectures non-AVR (comme le processeur Qualcomm de l'UNO Q),
 * PROGMEM n'est pas défini par défaut ou se comporte différemment.
 */

#if defined(__AVR__)
    // Si on est sur un Arduino classique (Uno, Nano, Mega)
    #include <avr/pgmspace.h>
#else
    // Si on est sur UNO Q, ESP32 ou autre architecture moderne
    #ifndef PROGMEM
        #define PROGMEM 
    #endif
    
    #ifndef PGM_P
        #define PGM_P const char *
    #endif
    
    #ifndef pgm_read_byte
        #define pgm_read_byte(addr) (*(const unsigned char *)(addr))
    #endif
    
    #ifndef pgm_read_word
        #define pgm_read_word(addr) (*(const unsigned short *)(addr))
    #endif

    #ifndef pgm_read_pointer
        #define pgm_read_pointer(addr) (*(const void **)(addr))
    #endif
#endif

#endif // PGMSPACE_FIX_H