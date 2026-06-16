# Liberiamo la mente — Scenari di Test (Gherkin / BDD)
> Beta test · Giugno 2076

---

## Feature: Registrazione e accesso

```gherkin
Feature: Registrazione nuovo utente

  Scenario: Registrazione come lettore
    Given mi trovo sulla pagina di accesso
    When scelgo "Diventa lettore"
    And inserisco email e password validi
    And clicco "Registrati"
    Then ricevo una email di conferma all'indirizzo indicato
    And il link nella email mi porta alla piattaforma attiva

  Scenario: Registrazione come autore
    Given mi trovo sulla pagina di accesso
    When scelgo "Diventa autore"
    And completo la registrazione
    Then accedo alla piattaforma con i permessi autore
    And vedo la voce "Area Riservata" nel menu

  Scenario: Login con credenziali corrette
    Given ho già un account attivo
    When inserisco email e password corretti
    And clicco "Accedi"
    Then vengo portato alla home autenticato
    And il mio nome/pseudonimo appare in alto a destra

  Scenario: Login con password errata
    Given ho già un account attivo
    When inserisco la password sbagliata
    And clicco "Accedi"
    Then vedo un messaggio di errore
    And resto sulla pagina di accesso

  Scenario: Accesso come ospite
    Given mi trovo sulla pagina di accesso
    When scelgo "Continua come ospite"
    Then accedo alla piattaforma senza account
    And posso sfogliare il catalogo
    But non posso votare nel cestino né lasciare recensioni
```

---

## Feature: Catalogo

```gherkin
Feature: Sfogliare il catalogo

  Scenario: Visualizzazione lista opere
    Given sono sulla pagina Catalogo
    Then vedo una lista di opere con copertina, titolo e autore
    And le opere con status "open" non appaiono nel catalogo

  Scenario: Filtro per genere
    Given sono sulla pagina Catalogo
    When seleziono il genere "Romanzo"
    Then vedo solo le opere di genere romanzo
    And le opere di altri generi scompaiono

  Scenario: Filtro per autore
    Given sono sulla pagina Catalogo
    When seleziono un autore dal filtro
    Then vedo solo le opere di quell'autore

  Scenario: Ordinamento per letture
    Given sono sulla pagina Catalogo
    When seleziono "Più letti"
    Then le opere sono ordinate per numero di letture decrescente

  Scenario: Opera riservata per utente autorizzato
    Given sono loggato con un'email in whitelist per un'opera riservata
    When vado al Catalogo
    Then vedo l'opera riservata insieme alle opere gratuite
    And posso aprirla e leggerla
```

---

## Feature: Lettura

```gherkin
Feature: Leggere un'opera

  Scenario: Apertura reader da catalogo
    Given sono sul Catalogo
    When clicco su un'opera gratuita
    Then vengo portato al reader dell'opera
    And vedo il primo capitolo

  Scenario: Navigazione tra capitoli
    Given sono nel reader di un'opera a capitoli
    When clicco sul capitolo successivo
    Then vedo il contenuto del capitolo successivo
    And la navigazione aggiorna il capitolo corrente

  Scenario: Segnalibro automatico
    Given sono loggato e ho già letto fino al capitolo 3 di un'opera
    When riapro quell'opera in un momento successivo
    Then il reader mi porta al capitolo 3
    And non devo cercarlo manualmente

  Scenario: Download PDF
    Given sono nel reader di un'opera con file PDF disponibile
    When clicco su "Scarica PDF"
    Then il file PDF viene scaricato sul mio dispositivo

  Scenario: Opera aperta reindirizza a Libri Aperti
    Given esiste un link diretto a /leggi/siamo-fragili
    And "Siamo fragili" è un Libro Aperto
    When accedo a quell'URL
    Then vengo reindirizzato automaticamente a /libri-aperti/siamo-fragili
```

---

## Feature: Libri Aperti

```gherkin
Feature: Seguire un Libro Aperto

  Scenario: Visualizzare la lista dei Libri Aperti
    Given sono sulla pagina Libri Aperti
    Then vedo le opere con badge "IN SCRITTURA"
    And vedo il numero di capitoli pubblicati per ciascuna

  Scenario: Accedere a un Libro Aperto
    Given sono sulla pagina Libri Aperti
    When clicco su un'opera
    Then vedo la pagina del libro con titolo, autore e descrizione
    And vedo la lista dei capitoli pubblicati

  Scenario: Leggere un capitolo
    Given sono sulla pagina di un Libro Aperto con almeno un capitolo
    When clicco su un capitolo
    Then il testo del capitolo si espande e posso leggerlo
    And il testo è formattato correttamente (non HTML grezzo)

  Scenario: Seguire un'opera — utente loggato
    Given sono loggato e sono sulla pagina di un Libro Aperto
    When clicco SEGUI
    Then il pulsante diventa "SMETTI DI SEGUIRE"
    And sono iscritto alle notifiche di quell'opera

  Scenario: Ricevere notifica nuovo capitolo
    Given sono iscritto a un Libro Aperto
    When l'autore pubblica un nuovo capitolo
    Then ricevo una email con il titolo del capitolo
    And l'email contiene un link diretto al libro

  Scenario: Smettere di seguire
    Given sto seguendo un Libro Aperto
    When clicco "SMETTI DI SEGUIRE"
    Then il pulsante torna a "SEGUI"
    And non ricevo più notifiche per quell'opera

  Scenario: Tentativo di seguire senza account
    Given sono ospite (non loggato)
    When sono sulla pagina di un Libro Aperto
    Then al posto del pulsante SEGUI vedo un invito ad accedere
    And cliccando vengo portato alla pagina di login
```

---

## Feature: Cestino degli Scritti Perduti

```gherkin
Feature: Votare nel Cestino

  Scenario: Visualizzare il Cestino
    Given clicco su "Cestino degli Scritti Perduti"
    Then vedo la lista delle opere ritirate
    And per ogni opera vedo il numero di voti ricevuti

  Scenario: Votare un'opera — utente loggato
    Given sono loggato e vedo un'opera nel Cestino
    When clicco su una valutazione (1-5 stelle)
    Then il voto viene registrato
    And vedo un messaggio di conferma o tooltip

  Scenario: Tentativo di voto doppio
    Given ho già votato un'opera nel Cestino
    When clicco di nuovo sulla stessa opera
    Then vedo un tooltip che indica che ho già votato
    And il mio voto precedente non cambia

  Scenario: Tentativo di voto senza account
    Given sono ospite (non loggato)
    When clicco per votare un'opera nel Cestino
    Then vedo una call to action che mi invita a registrarmi
    And non posso esprimere il voto
```

---

## Feature: Community e recensioni

```gherkin
Feature: Lasciare una recensione

  Scenario: Recensione di un'opera
    Given sono loggato e ho letto un'opera
    When vado nella pagina community dell'opera
    And seleziono un voto da 1 a 5 stelle
    And scrivo un testo di recensione
    And clicco "Invia"
    Then la mia recensione appare nella pagina
    And l'autore riceve una email di notifica

  Scenario: Reset voto dopo invio
    Given ho appena inviato una recensione con 4 stelle
    Then il selettore stelle torna a 1
    And posso lasciare una nuova recensione se voglio
```

---

## Feature: Libreria personale

```gherkin
Feature: Gestire la libreria

  Scenario: Aggiungere un'opera alla libreria
    Given sono loggato e sono nel reader di un'opera
    When aggiungo l'opera alla mia libreria
    Then l'opera appare nella sezione Libreria

  Scenario: Visualizzare la libreria
    Given ho almeno un'opera nella libreria
    When vado su Libreria nel menu
    Then vedo la lista delle mie opere salvate
    And vedo lo stato di lettura per ognuna
```

---

## Feature: Gestione opere (Autori)

```gherkin
Feature: Pubblicare una nuova opera

  Scenario: Creazione opera gratuita
    Given sono loggato come autore
    And sono in Gestione
    When clicco "Nuova opera"
    And compilo titolo, genere e descrizione
    And carico una copertina
    And imposto accesso "Gratuito"
    And clicco "Salva e pubblica"
    Then l'opera appare nel catalogo
    And i lettori possono trovarla e leggerla

  Scenario: Creazione Libro Aperto
    Given sono in Gestione e sto creando una nuova opera
    When attivo il toggle "Libro Aperto"
    And salvo l'opera
    Then l'opera appare in Libri Aperti (non nel Catalogo)
    And il badge "IN SCRITTURA" è visibile

  Scenario: Aggiunta capitolo a Libro Aperto con notifica
    Given ho un Libro Aperto con almeno un lettore iscritto
    When apro l'opera in Gestione
    And vado nella sezione Capitoli
    And aggiungo un nuovo capitolo con titolo e testo
    And clicco Salva
    Then il capitolo appare nella pagina del libro
    And i lettori iscritti ricevono una email con il titolo del capitolo

  Scenario: Apertura modifica opera — box chiusi
    Given sono in Gestione
    When clicco su un'opera esistente per modificarla
    Then la pagina scorre in cima
    And tutti i box (Metadati, Capitoli, Copertina, ecc.) sono chiusi
    And posso aprire solo quello che mi serve

  Scenario: Cestinare un'opera
    Given ho un'opera pubblicata
    When la sposto nel Cestino dalla Gestione
    Then scompare dal Catalogo
    And appare nel Cestino degli Scritti Perduti
    And i lettori possono votare per recuperarla
```

---

## Feature: Notifiche email

```gherkin
Feature: Ricezione email di sistema

  Scenario: Email di conferma registrazione
    Given mi sono appena registrato
    Then ricevo una email con oggetto "Conferma il tuo account"
    And il link nella email attiva il mio account

  Scenario: Email nuovo capitolo
    Given seguo un Libro Aperto
    When l'autore pubblica un nuovo capitolo
    Then ricevo una email da "notifiche@liberiamo2076.com"
    And l'email mostra logo Anthea Delori, nome del capitolo e pulsante "Leggi ora"

  Scenario: Email nuova recensione (per l'autore)
    Given sono autore di un'opera
    When un lettore lascia una recensione
    Then ricevo una email con il nome del recensore e un estratto
    And l'email contiene un link alla pagina community dell'opera
```
