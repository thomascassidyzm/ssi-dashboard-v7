const seeds = [
  { number: 99, known: "You should ask yourself why it's not working.", target: "Dovresti chiederti perché non funziona." },
  { number: 100, known: "You shouldn't worry about doing something similar.", target: "Non dovresti preoccuparti di fare qualcosa di simile." },
  { number: 101, known: "I'm enjoying finding out more about this language.", target: "Mi piace scoprire di più su questa lingua." },
  { number: 102, known: "We're trying to say that it's not like that.", target: "Stiamo provando a dire che non è così." },
  { number: 103, known: "We're not trying to hear many more words.", target: "Non stiamo provando a sentire molte più parole." },
  { number: 104, known: "We need to change what we're doing.", target: "Dobbiamo cambiare quello che stiamo facendo." },
  { number: 105, known: "That is why he didn't know the answer.", target: "Ecco perché non conosceva la risposta." },
  { number: 106, known: "We don't need to feel happy, we just need to work hard.", target: "Non dobbiamo sentirci felici, dobbiamo solo lavorare sodo." },
  { number: 107, known: "We hoped to see what you were doing.", target: "Speravamo di vedere che cosa stavi facendo." },
  { number: 108, known: "We didn't hope to wake in the middle of the night.", target: "Non speravamo di svegliarci nel mezzo della notte." },
  { number: 109, known: "We must work hard to learn a lot of new words.", target: "Dobbiamo lavorare sodo per imparare molte parole nuove." },
  { number: 110, known: "We're friends, and after we finish I'd like to relax.", target: "Siamo amici, e dopo che finiamo mi piacerebbe rilassarmi." },
  { number: 111, known: "When we learn something new it changes our brain.", target: "Quando impariamo qualcosa di nuovo, cambia il nostro cervello." },
  { number: 112, known: "That was very interesting, and I wasn't expecting it.", target: "Era molto interessante, e non me lo aspettavo." },
  { number: 113, known: "Why can't I remember what you said?", target: "Perché non riesco a ricordare quello che hai detto?" },
  { number: 114, known: "I feel as if I'm doing worse today than yesterday.", target: "Mi sento come se stessi andando peggio oggi di ieri." },
  { number: 115, known: "I don't feel as if I'm ready to have a conversation.", target: "Non mi sento come se fossi pronto a fare una conversazione." },
  { number: 116, known: "This isn't the best choice I could make.", target: "Questa non è la scelta migliore che potrei fare." },
  { number: 117, known: "I'm definitely doing better than I was last time we talked to each other.", target: "Sto sicuramente andando meglio di quando abbiamo parlato l'ultima volta." },
  { number: 118, known: "I feel better than I felt when we were in the pub.", target: "Mi sento meglio di come mi sentivo quando eravamo al pub." },
  { number: 119, known: "Can I ask you something before you leave?", target: "Posso chiederti qualcosa prima che tu vada via?" },
  { number: 120, known: "It's interesting that you like to go by bus.", target: "È interessante che ti piace andare in autobus." },
  { number: 121, known: "It's unusual that you don't like to use your car.", target: "È insolito che non ti piace usare la tua macchina." },
  { number: 122, known: "It's starting to feel easier and I'm excited about how it's going.", target: "Sta cominciando a sembrare più facile e sono entusiasta di come sta andando." },
  { number: 123, known: "I think that's a good idea.", target: "Penso che sia una buona idea." },
  { number: 124, known: "I thought that was a good idea.", target: "Pensavo che fosse una buona idea." },
  { number: 125, known: "I believe that your idea was very good.", target: "Credo che la tua idea fosse molto buona." },
  { number: 126, known: "This work is changing the shape of my brain.", target: "Questo lavoro sta cambiando la forma del mio cervello." },
];

// These are simple demonstrations of what each seed looks like
seeds.forEach((seed) => {
  console.log(`## Seed ${seed.number}`);
  console.log(`Known: ${seed.known}`);
  console.log(`Target: ${seed.target}`);
  console.log('');
});
