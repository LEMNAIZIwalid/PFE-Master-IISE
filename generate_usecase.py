import urllib.request
import os

# Code PlantUML du diagramme de cas d'utilisation général complet
plantuml_code = """
@startuml
left to right direction
skinparam packageStyle rect
skinparam actorStyle awesome
skinparam shadowing false
skinparam defaultFontName "Helvetica"

' Couleurs personnalisées HPS / PFE
skinparam actor {
    BackgroundColor #D9E5F2
    BorderColor #004B8D
    FontColor #004B8D
}

skinparam usecase {
    BackgroundColor #F0E6F7
    BorderColor #662D91
    FontColor #37195A
}

skinparam rectangle {
    BorderColor #B2B2B2
    BackgroundColor #FBFBFB
}

actor "Caissier / Vendeur" as Merchant
actor "Client" as Client
actor "PWC Admin" as AdminPWC
actor "External Admin" as AdminExt
database "Base de Données\\n(Oracle)" as DB

rectangle "Espace Services Client" {
    rectangle "Terminal Smart POS" {
        usecase "Scanner un article" as UC_scan
        usecase "Initier un paiement" as UC_init
        usecase "Effectuer un paiement NFC" as UC_pay
        
        UC_scan .> UC_init : <<extend>>
        UC_init .> UC_pay : <<include>>
    }

    rectangle "Application Mobile Client" {
        usecase "Visualiser l'historique" as UC_hist
        usecase "Effectuer un virement" as UC_vir
        usecase "S'authentifier" as UC_auth
    }
}

rectangle "Pipeline de Données & Validation" {
    usecase "Transmettre le flux\\n(MQTT -> Avro -> Kafka)" as UC_stream
    usecase "Valider le paiement" as UC_val
    usecase "Vérifier l'ID NTAG" as UC_verify
    
    UC_stream .> UC_verify : <<include>>
    UC_val .> UC_verify : <<extend>> (si NTAG valide)
}

rectangle "Dashboard Admin PWC" {
    usecase "Visualiser les transactions" as UC_trans_pwc
    usecase "Chercher une carte" as UC_search_pwc
    usecase "Gestion des Events" as UC_events_pwc
    usecase "Gestion des cartes" as UC_gest_pwc
}

rectangle "Dashboard Admin Externe" {
    usecase "Visualiser les transactions (EXT)" as UC_trans_ext
    usecase "Chercher une carte (EXT)" as UC_search_ext
    usecase "Visualiser les Events\\neffectués par PWC" as UC_events_ext
    usecase "Gestion des cartes (EXT)" as UC_gest_ext
}

' Relations Acteurs -> Use Cases
Merchant --> UC_scan
Merchant --> UC_init

Client --> UC_hist
Client --> UC_vir
Client --> UC_auth
Client --> UC_pay

AdminPWC --> UC_trans_pwc
AdminPWC --> UC_search_pwc
AdminPWC --> UC_events_pwc
AdminPWC --> UC_gest_pwc

AdminExt --> UC_trans_ext
AdminExt --> UC_search_ext
AdminExt --> UC_events_ext
AdminExt --> UC_gest_ext

' Inter-Package Relation
UC_pay ..> UC_stream : <<transmit>>

' DB access
UC_hist --> DB
UC_vir --> DB
UC_auth --> DB

UC_trans_pwc --> DB
UC_search_pwc --> DB
UC_events_pwc --> DB
UC_gest_pwc --> DB

UC_trans_ext --> DB
UC_search_ext --> DB
UC_events_ext --> DB
UC_gest_ext --> DB

UC_verify --> DB

@endum
"""

def generate_png():
    print("Envoi du diagramme PlantUML a l'API Kroki...")
    url = "https://kroki.io/plantuml/png"
    
    try:
        req = urllib.request.Request(
            url,
            data=plantuml_code.encode("utf-8"),
            headers={
                "Content-Type": "text/plain",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            image_data = response.read()
            
        output_file = "usecase_diagram.png"
        with open(output_file, "wb") as f:
            f.write(image_data)
            
        print(f"[OK] L'image du diagramme a ete generee : {os.path.abspath(output_file)}")
        
    except Exception as e:
        print(f"[ERREUR] Lors de la generation de l'image : {e}")

if __name__ == "__main__":
    generate_png()
