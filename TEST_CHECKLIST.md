# Liberiamo la mente — Checklist Beta Test
> Versione beta · Giugno 2076
>
> **Come usare questo documento:** segui ogni riga nell'ordine. Annota il risultato nella colonna **Esito** (✅ OK / ❌ KO / ⚠️ Parziale) e scrivi eventuali note nella colonna **Note / Bug**.

---

## BLOCCO A — Accesso e registrazione

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| A1 | Vai su liberiamo2076.com senza account | Vedi la home con menu e pulsante accesso |  |  |
| A2 | Clicca su Accedi / Area Riservata | Sei sulla pagina di login con 4 opzioni |  |  |
| A3 | Scegli "Continua come ospite" | Accedi alla piattaforma senza registrarti |  |  |
| A4 | Torna alla pagina login e scegli "Diventa lettore" | Form di registrazione con email e password |  |  |
| A5 | Completa la registrazione con email valida | Ricevi email di conferma nella inbox |  |  |
| A6 | Controlla la email e clicca il link di attivazione | Account attivato, sei loggato nella piattaforma |  |  |
| A7 | Esci dall'account e riaccedi con email + password | Accesso riuscito, nome visibile in alto a destra |  |  |
| A8 | Prova ad accedere con password sbagliata | Vedi un messaggio di errore, non entri |  |  |

---

## BLOCCO B — Catalogo

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| B1 | Vai su Catalogo dal menu | Vedi lista di opere con copertina, titolo, autore |  |  |
| B2 | Seleziona un genere dal filtro (es. Romanzo) | Rimangono solo le opere di quel genere |  |  |
| B3 | Seleziona un autore dal filtro | Rimangono solo le opere di quell'autore |  |  |
| B4 | Rimuovi tutti i filtri | Tornano tutte le opere |  |  |
| B5 | Ordina per "Più letti" | Le opere sono ordinate per numero di letture |  |  |
| B6 | Ordina per data di pubblicazione | Le opere si riordinano correttamente |  |  |
| B7 | Verifica che i Libri Aperti NON siano nel catalogo | Opere con badge "IN SCRITTURA" non appaiono qui |  |  |

---

## BLOCCO C — Lettura

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| C1 | Clicca su un'opera gratuita dal catalogo | Si apre il reader con il testo del primo capitolo |  |  |
| C2 | Naviga al capitolo successivo | Il testo cambia correttamente al capitolo 2 |  |  |
| C3 | Torna al capitolo precedente | Il testo torna al capitolo precedente |  |  |
| C4 | Chiudi il browser e riapri la stessa opera (loggato) | Il reader riparte dal capitolo dove ti eri fermato |  |  |
| C5 | Cerca un'opera con PDF disponibile e clicca "Scarica" | Il file PDF si scarica correttamente |  |  |
| C6 | Accedi tramite URL diretto /leggi/[slug-libro-aperto] | Vieni reindirizzato automaticamente a /libri-aperti/[slug] |  |  |

---

## BLOCCO D — Libri Aperti

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| D1 | Clicca su "Libri Aperti" nel menu | Vedi la lista delle opere in scrittura con badge "IN SCRITTURA" |  |  |
| D2 | Verifica che sia indicato il numero di capitoli per ogni opera | Ogni scheda mostra "X capitoli pubblicati" |  |  |
| D3 | Clicca su un'opera | Si apre la pagina con titolo, autore, descrizione e lista capitoli |  |  |
| D4 | Clicca su un capitolo | Il testo si espande, è leggibile e formattato correttamente |  |  |
| D5 | Verifica che il testo NON mostri tag HTML grezzi (es. `<p>`, `<br>`) | Il testo appare formattato, non come codice |  |  |
| D6 | Clicca "SEGUI" (da utente loggato) | Il pulsante diventa "SMETTI DI SEGUIRE" |  |  |
| D7 | Clicca "SMETTI DI SEGUIRE" | Il pulsante torna a "SEGUI" |  |  |
| D8 | Ri-clicca "SEGUI" e aspetta che l'autore aggiunga un capitolo | Ricevi una email con il titolo del nuovo capitolo |  |  |
| D9 | Controlla la email ricevuta | Ha logo Anthea Delori, sfondo crema, pulsante "Leggi ora" |  |  |
| D10 | Prova a cliccare "SEGUI" come ospite non loggato | Vedi un invito ad accedere, non il pulsante SEGUI |  |  |

---

## BLOCCO E — Cestino degli Scritti Perduti

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| E1 | Clicca sull'icona Cestino in alto a destra | Vedi la lista delle opere ritirate |  |  |
| E2 | Verifica che ogni opera mostri i voti ricevuti | Appare il numero di voti o un indicatore |  |  |
| E3 | Clicca su una valutazione per un'opera (loggato) | Il voto viene registrato, vedi conferma o tooltip |  |  |
| E4 | Prova a votare di nuovo la stessa opera | Vedi un tooltip che dice che hai già votato |  |  |
| E5 | Prova a votare come ospite non loggato | Vedi una CTA che ti invita a registrarti |  |  |

---

## BLOCCO F — Community e recensioni

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| F1 | Vai nella sezione Community di un'opera | Vedi le recensioni esistenti (se presenti) |  |  |
| F2 | Seleziona 4 stelle e scrivi un testo di recensione | Il form accetta input |  |  |
| F3 | Clicca "Invia" | La recensione appare nella pagina |  |  |
| F4 | Verifica che l'autore riceva una email | Email con nome recensore, titolo opera, estratto commento |  |  |
| F5 | Dopo l'invio controlla il selettore stelle | Torna a 1 stella (reset automatico) |  |  |

---

## BLOCCO G — Libreria personale

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| G1 | Da una scheda opera, aggiungila alla tua libreria | Conferma visiva dell'aggiunta |  |  |
| G2 | Vai su Libreria nel menu | Vedi l'opera appena aggiunta |  |  |
| G3 | Verifica lo stato di lettura | Mostra "In lettura", "Completato" o simile |  |  |

---

## BLOCCO H — Area Autore (solo account autore)

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| H1 | Accedi con account autore e vai in Area Riservata | Vedi la dashboard con ultime recensioni e statistiche |  |  |
| H2 | Vai in Gestione e clicca su un'opera esistente | La pagina scorre in cima e tutti i box sono chiusi |  |  |
| H3 | Apri manualmente il box Metadati | Si espande mostrando tutti i campi |  |  |
| H4 | Clicca "Nuova opera" e compila titolo e genere | Puoi salvare l'opera |  |  |
| H5 | Crea un'opera con accesso "Gratuito" e salvala | L'opera appare nel Catalogo |  |  |
| H6 | Crea un'opera e attiva il toggle "Libro Aperto" | L'opera appare in Libri Aperti, NON nel Catalogo |  |  |
| H7 | Aggiungi un capitolo al Libro Aperto | Il capitolo appare nella pagina del libro |  |  |
| H8 | Verifica che i lettori iscritti ricevano la notifica | Email nuovo capitolo inviata agli iscritti |  |  |
| H9 | Sposta un'opera nel Cestino | Scompare dal Catalogo e appare nel Cestino |  |  |
| H10 | Verifica la copertina caricata manualmente | Immagine visibile nella scheda opera |  |  |

---

## BLOCCO I — Navigazione generale

| # | Cosa fare | Cosa aspettarsi | Esito | Note / Bug |
|---|-----------|-----------------|-------|------------|
| I1 | Controlla che tutte le voci del menu siano presenti | HOME, CATALOGO, AUTORI, LIBRERIA, COMMUNITY, LIBRI APERTI, REGOLE, AREA RISERVATA, CESTINO |  |  |
| I2 | Testa la navigazione da mobile (o ridimensiona il browser) | Menu si adatta, contenuto leggibile |  |  |
| I3 | Prova un URL che non esiste (es. /pagina-inesistente) | Vedi una pagina 404 o reindirizzamento |  |  |
| I4 | Torna indietro con il pulsante del browser dopo la lettura | Torni al catalogo o alla pagina precedente senza errori |  |  |

---

## Note generali del tester

> Usa questo spazio per osservazioni che non rientrano in nessuna riga sopra.

| Area | Osservazione | Priorità (Alta/Media/Bassa) |
|------|--------------|------------------------------|
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

---

*Grazie per il tuo contributo al beta test di Liberiamo la mente.*
