#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const translations = `301. He said that he wants to show you something.
301. Il a dit qu'il veut te montrer quelque chose.

302. She said that she doesn't want to live in a city.
302. Elle a dit qu'elle ne veut pas vivre en ville.

303. I want to understand what you said.
303. Je veux comprendre ce que tu as dit.

304. Do you know where I can find a good place to eat?
304. Sais-tu où je peux trouver un bon endroit pour manger ?

305. I need to know when you're going to be ready.
305. J'ai besoin de savoir quand tu vas être prêt.

306. Can you tell me what time the meeting is tomorrow?
306. Peux-tu me dire à quelle heure est la réunion demain ?

307. I think that it's important to learn new things every day.
307. Je pense qu'il est important d'apprendre de nouvelles choses chaque jour.

308. He doesn't know how to speak French very well.
308. Il ne sait pas très bien parler français.

309. She wants to go to the beach this weekend.
309. Elle veut aller à la plage ce week-end.

310. I'm going to try to finish this before dinner.
310. Je vais essayer de finir ça avant le dîner.

311. Do you think that we'll have time to visit the museum?
311. Penses-tu que nous aurons le temps de visiter le musée ?

312. I don't think that I can come to the party tonight.
312. Je ne pense pas que je puisse venir à la fête ce soir.

313. He said that he's going to call you later.
313. Il a dit qu'il va t'appeler plus tard.

314. She asked if I wanted to go with her.
314. Elle a demandé si je voulais aller avec elle.

315. I need to buy some food for dinner tonight.
315. J'ai besoin d'acheter de la nourriture pour le dîner ce soir.

316. Can you help me find my keys?
316. Peux-tu m'aider à trouver mes clés ?

317. I want to learn how to cook better.
317. Je veux apprendre à mieux cuisiner.

318. Do you know where the nearest post office is?
318. Sais-tu où est le bureau de poste le plus proche ?

319. I think that we should leave soon.
319. Je pense que nous devrions partir bientôt.

320. He doesn't want to talk about it right now.
320. Il ne veut pas en parler maintenant.

321. She's going to meet us at the restaurant.
321. Elle va nous retrouver au restaurant.

322. I'm trying to learn Spanish this year.
322. J'essaie d'apprendre l'espagnol cette année.

323. Do you think that it's going to rain tomorrow?
323. Penses-tu qu'il va pleuvoir demain ?

324. I don't know if I can finish this today.
324. Je ne sais pas si je peux finir ça aujourd'hui.

325. He said that he needs to go home early.
325. Il a dit qu'il a besoin de rentrer tôt.

326. She asked me to help her with her homework.
326. Elle m'a demandé de l'aider avec ses devoirs.

327. I want to know what you think about this.
327. Je veux savoir ce que tu penses de ça.

328. Can you show me how to do this?
328. Peux-tu me montrer comment faire ça ?

329. I need to talk to you about something important.
329. J'ai besoin de te parler de quelque chose d'important.

330. Do you know how long it takes to get there?
330. Sais-tu combien de temps ça prend pour y aller ?

331. I think that this is a good idea.
331. Je pense que c'est une bonne idée.

332. He doesn't like to wake up early.
332. Il n'aime pas se réveiller tôt.

333. She wants to study abroad next year.
333. Elle veut étudier à l'étranger l'année prochaine.

334. I'm going to visit my family next month.
334. Je vais rendre visite à ma famille le mois prochain.

335. Do you think that we need to bring anything?
335. Penses-tu que nous devons apporter quelque chose ?

336. I don't think that this is a good time to talk.
336. Je ne pense pas que ce soit le bon moment pour parler.

337. He said that he can't come to the meeting.
337. Il a dit qu'il ne peut pas venir à la réunion.

338. She asked if I knew the answer.
338. Elle a demandé si je connaissais la réponse.

339. I need to send an email before I leave.
339. J'ai besoin d'envoyer un e-mail avant de partir.

340. Can you tell me where you're going?
340. Peux-tu me dire où tu vas ?

341. I want to understand why this happened.
341. Je veux comprendre pourquoi c'est arrivé.

342. Do you know when they're going to arrive?
342. Sais-tu quand ils vont arriver ?

343. I think that it's too late to change our plans.
343. Je pense qu'il est trop tard pour changer nos plans.

344. He doesn't know what to say.
344. Il ne sait pas quoi dire.

345. She's going to start her new job next week.
345. Elle va commencer son nouveau travail la semaine prochaine.

346. I'm trying to save money for a trip.
346. J'essaie d'économiser de l'argent pour un voyage.

347. Do you think that they'll like this?
347. Penses-tu qu'ils vont aimer ça ?

348. I don't know what to do about this problem.
348. Je ne sais pas quoi faire à propos de ce problème.

349. He said that he wants to learn to play guitar.
349. Il a dit qu'il veut apprendre à jouer de la guitare.

350. She asked me to call her tomorrow.
350. Elle m'a demandé de l'appeler demain.

351. I want to see the new movie that just came out.
351. Je veux voir le nouveau film qui vient de sortir.

352. Can you explain this to me again?
352. Peux-tu m'expliquer ça encore une fois ?

353. I need to make a decision soon.
353. J'ai besoin de prendre une décision bientôt.

354. Do you know where I left my phone?
354. Sais-tu où j'ai laissé mon téléphone ?

355. I think that we should try something different.
355. Je pense que nous devrions essayer quelque chose de différent.

356. He doesn't want to go out tonight.
356. Il ne veut pas sortir ce soir.

357. She wants to buy a new car.
357. Elle veut acheter une nouvelle voiture.

358. I'm going to take a break for a few minutes.
358. Je vais prendre une pause pendant quelques minutes.

359. Do you think that this will work?
359. Penses-tu que ça va marcher ?

360. I don't think that I understand what you mean.
360. Je ne pense pas que je comprenne ce que tu veux dire.

361. He said that he's too busy to help right now.
361. Il a dit qu'il est trop occupé pour aider maintenant.

362. She asked if I could pick her up from the airport.
362. Elle a demandé si je pouvais aller la chercher à l'aéroport.

363. I need to clean my room before my parents arrive.
363. J'ai besoin de nettoyer ma chambre avant que mes parents arrivent.

364. Can you wait for me here?
364. Peux-tu m'attendre ici ?

365. I want to learn more about this topic.
365. Je veux en savoir plus sur ce sujet.

366. Do you know if the store is still open?
366. Sais-tu si le magasin est encore ouvert ?

367. I think that it's a beautiful day today.
367. Je pense que c'est une belle journée aujourd'hui.

368. He doesn't like to exercise in the morning.
368. Il n'aime pas faire de l'exercice le matin.

369. She's going to graduate from university next year.
369. Elle va obtenir son diplôme universitaire l'année prochaine.

370. I'm trying to be more organized.
370. J'essaie d'être plus organisé.

371. Do you think that we should invite them?
371. Penses-tu que nous devrions les inviter ?

372. I don't know how to solve this problem.
372. Je ne sais pas comment résoudre ce problème.

373. He said that he'll be there in ten minutes.
373. Il a dit qu'il sera là dans dix minutes.

374. She asked me to bring some drinks.
374. Elle m'a demandé d'apporter des boissons.

375. I want to make sure that everything is ready.
375. Je veux m'assurer que tout est prêt.

376. Can you remind me to call him later?
376. Peux-tu me rappeler de l'appeler plus tard ?

377. I need to find a new apartment.
377. J'ai besoin de trouver un nouvel appartement.

378. Do you know what time the train leaves?
378. Sais-tu à quelle heure part le train ?

379. I think that this is the right decision.
379. Je pense que c'est la bonne décision.

380. He doesn't know how to get there from here.
380. Il ne sait pas comment y aller d'ici.

381. She wants to spend more time with her family.
381. Elle veut passer plus de temps avec sa famille.

382. I'm going to stay home tonight.
382. Je vais rester à la maison ce soir.

383. Do you think that they're coming?
383. Penses-tu qu'ils viennent ?

384. I don't think that I have enough time.
384. Je ne pense pas que j'aie assez de temps.

385. He said that he forgot to bring his wallet.
385. Il a dit qu'il a oublié d'apporter son portefeuille.

386. She asked if I wanted something to drink.
386. Elle a demandé si je voulais quelque chose à boire.

387. I need to get some rest before tomorrow.
387. J'ai besoin de me reposer avant demain.

388. Can you turn off the light?
388. Peux-tu éteindre la lumière ?

389. I want to know if you're okay.
389. Je veux savoir si tu vas bien.

390. Do you know where we should meet?
390. Sais-tu où nous devrions nous retrouver ?

391. I think that we're almost done.
391. Je pense que nous avons presque fini.

392. He doesn't want to miss the concert.
392. Il ne veut pas manquer le concert.

393. She's going to move to a new city.
393. Elle va déménager dans une nouvelle ville.

394. I'm trying to learn from my mistakes.
394. J'essaie d'apprendre de mes erreurs.

395. Do you think that it's worth it?
395. Penses-tu que ça en vaut la peine ?

396. I don't know what happened yesterday.
396. Je ne sais pas ce qui s'est passé hier.

397. He said that he needs to think about it.
397. Il a dit qu'il a besoin d'y réfléchir.

398. She asked me to wait for her.
398. Elle m'a demandé de l'attendre.

399. I want to go for a walk.
399. Je veux aller me promener.

400. Can you pass me the salt?
400. Peux-tu me passer le sel ?

401. I need to prepare for my presentation.
401. J'ai besoin de me préparer pour ma présentation.

402. Do you know who's coming to the party?
402. Sais-tu qui vient à la fête ?

403. I think that this looks great.
403. Je pense que ça a l'air génial.

404. He doesn't like to travel by plane.
404. Il n'aime pas voyager en avion.

405. She wants to become a doctor.
405. Elle veut devenir médecin.

406. I'm going to read a book tonight.
406. Je vais lire un livre ce soir.

407. Do you think that we should wait?
407. Penses-tu que nous devrions attendre ?

408. I don't think that this is fair.
408. Je ne pense pas que ce soit juste.

409. He said that he can help us tomorrow.
409. Il a dit qu'il peut nous aider demain.

410. She asked if I had seen her bag.
410. Elle a demandé si j'avais vu son sac.

411. I need to practice more often.
411. J'ai besoin de m'entraîner plus souvent.

412. Can you open the window?
412. Peux-tu ouvrir la fenêtre ?

413. I want to try that new restaurant.
413. Je veux essayer ce nouveau restaurant.

414. Do you know what this means?
414. Sais-tu ce que ça veut dire ?

415. I think that it's getting late.
415. Je pense qu'il se fait tard.

416. He doesn't know where to go.
416. Il ne sait pas où aller.

417. She's going to take a vacation next month.
417. Elle va prendre des vacances le mois prochain.

418. I'm trying to focus on my work.
418. J'essaie de me concentrer sur mon travail.

419. Do you think that this is a good price?
419. Penses-tu que c'est un bon prix ?

420. I don't know why they're late.
420. Je ne sais pas pourquoi ils sont en retard.

421. He said that he enjoyed the movie.
421. Il a dit qu'il a aimé le film.

422. She asked me to close the door.
422. Elle m'a demandé de fermer la porte.

423. I want to remember this moment.
423. Je veux me souvenir de ce moment.

424. Can you hear me?
424. Peux-tu m'entendre ?

425. I need to charge my phone.
425. J'ai besoin de charger mon téléphone.

426. Do you know how much this costs?
426. Sais-tu combien ça coûte ?

427. I think that we're lost.
427. Je pense que nous sommes perdus.

428. He doesn't want to be late.
428. Il ne veut pas être en retard.

429. She wants to learn to dance.
429. Elle veut apprendre à danser.

430. I'm going to cook dinner for us tonight.
430. Je vais préparer le dîner pour nous ce soir.

431. Do you think that they know about this?
431. Penses-tu qu'ils sont au courant de ça ?

432. I don't think that I can do this alone.
432. Je ne pense pas que je puisse faire ça seul.

433. He said that he's feeling much better now.
433. Il a dit qu'il se sent beaucoup mieux maintenant.

434. She asked if I could help her move.
434. Elle a demandé si je pouvais l'aider à déménager.

435. I need to take my medicine.
435. J'ai besoin de prendre mes médicaments.

436. Can you believe what just happened?
436. Peux-tu croire ce qui vient de se passer ?

437. I want to spend the weekend relaxing.
437. Je veux passer le week-end à me détendre.

438. Do you know if they're still there?
438. Sais-tu s'ils sont encore là ?

439. I think that this is exactly what we need.
439. Je pense que c'est exactement ce dont nous avons besoin.

440. He doesn't like to ask for help.
440. Il n'aime pas demander de l'aide.

441. She's going to celebrate her birthday next week.
441. Elle va fêter son anniversaire la semaine prochaine.

442. I'm trying to stay positive.
442. J'essaie de rester positif.

443. Do you think that it's safe?
443. Penses-tu que c'est sûr ?

444. I don't know where I put my glasses.
444. Je ne sais pas où j'ai mis mes lunettes.

445. He said that he needs a break.
445. Il a dit qu'il a besoin d'une pause.

446. She asked me to bring my camera.
446. Elle m'a demandé d'apporter mon appareil photo.

447. I want to make a good impression.
447. Je veux faire bonne impression.

448. Can you speak more slowly?
448. Peux-tu parler plus lentement ?

449. I need to wash my clothes.
449. J'ai besoin de laver mes vêtements.

450. Do you know what we're supposed to do?
450. Sais-tu ce que nous sommes censés faire ?

451. I think that everything will be okay.
451. Je pense que tout ira bien.

452. He doesn't want to give up.
452. Il ne veut pas abandonner.

453. She wants to write a book someday.
453. Elle veut écrire un livre un jour.

454. I'm going to get up early tomorrow.
454. Je vais me lever tôt demain.

455. Do you think that we have enough food?
455. Penses-tu que nous avons assez de nourriture ?

456. I don't think that they understand.
456. Je ne pense pas qu'ils comprennent.

457. He said that he's proud of you.
457. Il a dit qu'il est fier de toi.

458. She asked if I knew the way.
458. Elle a demandé si je connaissais le chemin.

459. I need to fix this problem.
459. J'ai besoin de régler ce problème.

460. Can you keep a secret?
460. Peux-tu garder un secret ?

461. I want to see you again soon.
461. Je veux te revoir bientôt.

462. Do you know if there's a bathroom nearby?
462. Sais-tu s'il y a des toilettes à proximité ?

463. I think that this is important.
463. Je pense que c'est important.

464. He doesn't know what time it is.
464. Il ne sait pas quelle heure il est.

465. She's going to paint her room this weekend.
465. Elle va peindre sa chambre ce week-end.

466. I'm trying to remember his name.
466. J'essaie de me souvenir de son nom.

467. Do you think that this is true?
467. Penses-tu que c'est vrai ?

468. I don't know how to thank you.
468. Je ne sais pas comment te remercier.

469. He said that he's sorry for being late.
469. Il a dit qu'il est désolé d'être en retard.

470. She asked me to turn down the music.
470. Elle m'a demandé de baisser la musique.

471. I want to change my hairstyle.
471. Je veux changer ma coiffure.

472. Can you hold this for me?
472. Peux-tu tenir ça pour moi ?

473. I need to cancel my appointment.
473. J'ai besoin d'annuler mon rendez-vous.

474. Do you know how to get to the station from here?
474. Sais-tu comment aller à la gare d'ici ?

475. I think that we should talk about this later.
475. Je pense que nous devrions parler de ça plus tard.

476. He doesn't like to shop for clothes.
476. Il n'aime pas faire les magasins pour acheter des vêtements.

477. She wants to improve her English.
477. Elle veut améliorer son anglais.

478. I'm going to meet him at the cafe.
478. Je vais le retrouver au café.

479. Do you think that it's going to snow?
479. Penses-tu qu'il va neiger ?

480. I don't think that this is the right place.
480. Je ne pense pas que ce soit le bon endroit.

481. He said that he can't remember.
481. Il a dit qu'il ne peut pas se souvenir.

482. She asked if I was feeling okay.
482. Elle a demandé si j'allais bien.

483. I need to pay attention.
483. J'ai besoin de faire attention.

484. Can you lend me some money?
484. Peux-tu me prêter de l'argent ?

485. I want to know the truth.
485. Je veux connaître la vérité.

486. Do you know where the library is?
486. Sais-tu où est la bibliothèque ?

487. I think that this tastes delicious.
487. Je pense que c'est délicieux.

488. He doesn't want to be alone.
488. Il ne veut pas être seul.

489. She's going to apply for a new job.
489. Elle va postuler pour un nouveau travail.

490. I'm trying to be patient.
490. J'essaie d'être patient.

491. Do you think that we should call them?
491. Penses-tu que nous devrions les appeler ?

492. I don't know what to wear.
492. Je ne sais pas quoi porter.

493. He said that he agrees with you.
493. Il a dit qu'il est d'accord avec toi.

494. She asked me to be quiet.
494. Elle m'a demandé d'être silencieux.

495. I want to get some fresh air.
495. Je veux prendre l'air.

496. Can you recommend a good hotel?
496. Peux-tu recommander un bon hôtel ?

497. I need to check my email.
497. J'ai besoin de vérifier mes e-mails.

498. Do you know when the next bus comes?
498. Sais-tu quand passe le prochain bus ?

499. I think that we're going in the right direction.
499. Je pense que nous allons dans la bonne direction.

500. He doesn't like to waste time.
500. Il n'aime pas perdre du temps.

501. She wants to visit Paris someday.
501. Elle veut visiter Paris un jour.

502. I'm going to have a cup of coffee.
502. Je vais prendre une tasse de café.

503. Do you think that this is necessary?
503. Penses-tu que c'est nécessaire ?

504. I don't think that I'm ready yet.
504. Je ne pense pas que je sois encore prêt.

505. He said that he'll try his best.
505. Il a dit qu'il fera de son mieux.

506. She asked if I had any questions.
506. Elle a demandé si j'avais des questions.

507. I need to hurry or I'll be late.
507. J'ai besoin de me dépêcher ou je serai en retard.

508. Can you take a photo of us?
508. Peux-tu prendre une photo de nous ?

509. I want to feel better soon.
509. Je veux me sentir mieux bientôt.

510. Do you know what this is called?
510. Sais-tu comment ça s'appelle ?

511. I think that it's time to go home.
511. Je pense qu'il est temps de rentrer à la maison.

512. He doesn't know how to swim.
512. Il ne sait pas nager.

513. She's going to bake a cake for the party.
513. Elle va faire un gâteau pour la fête.

514. I'm trying to quit smoking.
514. J'essaie d'arrêter de fumer.

515. Do you think that they're happy?
515. Penses-tu qu'ils sont heureux ?

516. I don't know what else to say.
516. Je ne sais pas quoi dire d'autre.

517. He said that he found a solution.
517. Il a dit qu'il a trouvé une solution.

518. She asked me to join them.
518. Elle m'a demandé de les rejoindre.

519. I want to make new friends.
519. Je veux me faire de nouveaux amis.

520. Can you repeat that please?
520. Peux-tu répéter s'il te plaît ?

521. I need to save this file.
521. J'ai besoin de sauvegarder ce fichier.

522. Do you know if they sell this here?
522. Sais-tu s'ils vendent ça ici ?

523. I think that this is a mistake.
523. Je pense que c'est une erreur.

524. He doesn't want to lose his job.
524. Il ne veut pas perdre son emploi.

525. She wants to adopt a pet.
525. Elle veut adopter un animal de compagnie.

526. I'm going to watch a movie later.
526. Je vais regarder un film plus tard.

527. Do you think that we need to reserve a table?
527. Penses-tu que nous devons réserver une table ?

528. I don't think that this will fit.
528. Je ne pense pas que ça va rentrer.

529. He said that he's having a great time.
529. Il a dit qu'il passe un très bon moment.

530. She asked if I could translate this for her.
530. Elle a demandé si je pouvais traduire ça pour elle.

531. I need to improve my skills.
531. J'ai besoin d'améliorer mes compétences.

532. Can you give me a hand?
532. Peux-tu me donner un coup de main ?

533. I want to achieve my goals.
533. Je veux atteindre mes objectifs.

534. Do you know where I can buy tickets?
534. Sais-tu où je peux acheter des billets ?

535. I think that we should celebrate.
535. Je pense que nous devrions célébrer.

536. He doesn't like to argue.
536. Il n'aime pas se disputer.

537. She's going to organize a meeting.
537. Elle va organiser une réunion.

538. I'm trying to save the environment.
538. J'essaie de sauver l'environnement.

539. Do you think that this is enough?
539. Penses-tu que c'est assez ?

540. I don't know where to start.
540. Je ne sais pas par où commencer.

541. He said that he's interested in history.
541. Il a dit qu'il s'intéresse à l'histoire.

542. She asked me to turn on the heater.
542. Elle m'a demandé d'allumer le chauffage.

543. I want to explore the city.
543. Je veux explorer la ville.

544. Can you follow me?
544. Peux-tu me suivre ?

545. I need to update my resume.
545. J'ai besoin de mettre à jour mon CV.

546. Do you know what the weather will be like?
546. Sais-tu quel temps il fera ?

547. I think that this is the best option.
547. Je pense que c'est la meilleure option.

548. He doesn't want to cause any trouble.
548. Il ne veut pas causer de problèmes.

549. She wants to start her own business.
549. Elle veut créer sa propre entreprise.

550. I'm going to walk to work today.
550. Je vais aller au travail à pied aujourd'hui.

551. Do you think that it's too cold outside?
551. Penses-tu qu'il fait trop froid dehors ?

552. I don't think that I've been here before.
552. Je ne pense pas que je sois déjà venu ici.

553. He said that he loves this song.
553. Il a dit qu'il adore cette chanson.

554. She asked if I needed anything else.
554. Elle a demandé si j'avais besoin d'autre chose.

555. I need to be more careful.
555. J'ai besoin d'être plus prudent.

556. Can you stay here for a minute?
556. Peux-tu rester ici une minute ?

557. I want to live in a different country.
557. Je veux vivre dans un autre pays.

558. Do you know if this is available?
558. Sais-tu si c'est disponible ?

559. I think that it's a wonderful opportunity.
559. Je pense que c'est une merveilleuse opportunité.

560. He doesn't know anyone here.
560. Il ne connaît personne ici.

561. She's going to study for her exam tonight.
561. Elle va étudier pour son examen ce soir.

562. I'm trying to understand this concept.
562. J'essaie de comprendre ce concept.

563. Do you think that we're doing the right thing?
563. Penses-tu que nous faisons la bonne chose ?

564. I don't know how much longer I can wait.
564. Je ne sais pas combien de temps encore je peux attendre.

565. He said that he wants to try something new.
565. Il a dit qu'il veut essayer quelque chose de nouveau.

566. She asked me to save her a seat.
566. Elle m'a demandé de lui garder une place.

567. I want to reduce stress in my life.
567. Je veux réduire le stress dans ma vie.

568. Can you check if the door is locked?
568. Peux-tu vérifier si la porte est fermée à clé ?

569. I need to find a solution quickly.
569. J'ai besoin de trouver une solution rapidement.

570. Do you know who won the game?
570. Sais-tu qui a gagné le match ?

571. I think that this is absolutely beautiful.
571. Je pense que c'est absolument magnifique.

572. He doesn't want to change his mind.
572. Il ne veut pas changer d'avis.

573. She wants to protect the animals.
573. Elle veut protéger les animaux.

574. I'm going to send you a message later.
574. Je vais t'envoyer un message plus tard.

575. Do you think that we should ask for directions?
575. Penses-tu que nous devrions demander notre chemin ?

576. I don't think that this is what I ordered.
576. Je ne pense pas que ce soit ce que j'ai commandé.

577. He said that he's excited about the trip.
577. Il a dit qu'il est excité pour le voyage.

578. She asked if I wanted to join the team.
578. Elle a demandé si je voulais rejoindre l'équipe.

579. I need to concentrate on my studies.
579. J'ai besoin de me concentrer sur mes études.

580. Can you pick me up after work?
580. Peux-tu venir me chercher après le travail ?

581. I want to discover new places.
581. Je veux découvrir de nouveaux endroits.

582. Do you know if there are any seats left?
582. Sais-tu s'il reste des places ?

583. I think that we've met before.
583. Je pense que nous nous sommes déjà rencontrés.

584. He doesn't like to drive at night.
584. Il n'aime pas conduire la nuit.

585. She's going to look for a new house.
585. Elle va chercher une nouvelle maison.

586. I'm trying to build my confidence.
586. J'essaie de développer ma confiance.

587. Do you think that this is acceptable?
587. Penses-tu que c'est acceptable ?

588. I don't know if I should tell them.
588. Je ne sais pas si je devrais leur dire.

589. He said that he's willing to compromise.
589. Il a dit qu'il est prêt à faire des compromis.

590. She asked me to print these documents.
590. Elle m'a demandé d'imprimer ces documents.

591. I want to contribute to the project.
591. Je veux contribuer au projet.

592. Can you teach me how to do that?
592. Peux-tu m'apprendre comment faire ça ?

593. I need to replace the batteries.
593. J'ai besoin de remplacer les piles.

594. Do you know what page we're on?
594. Sais-tu à quelle page nous en sommes ?

595. I think that this deserves recognition.
595. Je pense que ça mérite d'être reconnu.

596. He doesn't want to admit that he was wrong.
596. Il ne veut pas admettre qu'il avait tort.

597. She wants to volunteer at the hospital.
597. Elle veut faire du bénévolat à l'hôpital.

598. I'm going to rest for a while.
598. Je vais me reposer un moment.

599. Do you think that they'll understand?
599. Penses-tu qu'ils vont comprendre ?

600. I don't think that this is appropriate.
600. Je ne pense pas que ce soit approprié.

601. He said that he needs more information.
601. Il a dit qu'il a besoin de plus d'informations.

602. She asked if I could speak louder.
602. Elle a demandé si je pouvais parler plus fort.

603. I need to adjust my schedule.
603. J'ai besoin d'ajuster mon emploi du temps.

604. Can you describe what you saw?
604. Peux-tu décrire ce que tu as vu ?

605. I want to maintain a healthy lifestyle.
605. Je veux maintenir un mode de vie sain.

606. Do you know if parking is free?
606. Sais-tu si le stationnement est gratuit ?

607. I think that this is fascinating.
607. Je pense que c'est fascinant.

608. He doesn't know how to use this device.
608. Il ne sait pas comment utiliser cet appareil.

609. She's going to present her ideas at the meeting.
609. Elle va présenter ses idées à la réunion.

610. I'm trying to avoid making mistakes.
610. J'essaie d'éviter de faire des erreurs.

611. Do you think that we should take a taxi?
611. Penses-tu que nous devrions prendre un taxi ?

612. I don't know where this road leads.
612. Je ne sais pas où mène cette route.

613. He said that he's grateful for your help.
613. Il a dit qu'il est reconnaissant pour ton aide.

614. She asked me to sign this form.
614. Elle m'a demandé de signer ce formulaire.

615. I want to participate in the competition.
615. Je veux participer à la compétition.

616. Can you recommend a good book?
616. Peux-tu recommander un bon livre ?

617. I need to confirm the reservation.
617. J'ai besoin de confirmer la réservation.

618. Do you know where they went?
618. Sais-tu où ils sont allés ?

619. I think that this requires more thought.
619. Je pense que ça nécessite plus de réflexion.

620. He doesn't want to disappoint anyone.
620. Il ne veut décevoir personne.

621. She wants to develop her talents.
621. Elle veut développer ses talents.

622. I'm going to exercise more regularly.
622. Je vais faire de l'exercice plus régulièrement.

623. Do you think that this is realistic?
623. Penses-tu que c'est réaliste ?

624. I don't think that I can afford this.
624. Je ne pense pas que je puisse me permettre ça.

625. He said that he's confident about the outcome.
625. Il a dit qu'il est confiant quant au résultat.

626. She asked if I had received her message.
626. Elle a demandé si j'avais reçu son message.

627. I need to protect my privacy.
627. J'ai besoin de protéger ma vie privée.

628. Can you measure this for me?
628. Peux-tu mesurer ça pour moi ?

629. I want to appreciate the small things.
629. Je veux apprécier les petites choses.

630. Do you know if they accept credit cards?
630. Sais-tu s'ils acceptent les cartes de crédit ?

631. I think that this is incredibly important.
631. Je pense que c'est incroyablement important.

632. He doesn't like to make promises.
632. Il n'aime pas faire de promesses.

633. She's going to attend the conference.
633. Elle va assister à la conférence.

634. I'm trying to establish good habits.
635. J'essaie d'établir de bonnes habitudes.

636. Do you think that this is genuine?
636. Penses-tu que c'est authentique ?

637. I don't know how to operate this machine.
637. Je ne sais pas comment faire fonctionner cette machine.

638. He said that he respects your opinion.
638. Il a dit qu'il respecte ton opinion.

639. She asked me to check the time.
639. Elle m'a demandé de vérifier l'heure.

640. I want to overcome my fears.
640. Je veux surmonter mes peurs.

641. Can you handle this situation?
641. Peux-tu gérer cette situation ?

642. I need to purchase a gift.
642. J'ai besoin d'acheter un cadeau.

643. Do you know if the event is cancelled?
643. Sais-tu si l'événement est annulé ?

644. I think that this is unacceptable.
644. Je pense que c'est inacceptable.

645. He doesn't want to interrupt you.
645. Il ne veut pas t'interrompre.

646. She wants to pursue her dreams.
646. Elle veut poursuivre ses rêves.

647. I'm going to wear something comfortable.
647. Je vais porter quelque chose de confortable.

648. Do you think that we should complain?
648. Penses-tu que nous devrions nous plaindre ?

649. I don't think that this is ethical.
649. Je ne pense pas que ce soit éthique.

650. He said that he's committed to this project.
650. Il a dit qu'il est engagé dans ce projet.

651. She asked if I knew her address.
651. Elle a demandé si je connaissais son adresse.

652. I need to organize my thoughts.
652. J'ai besoin d'organiser mes pensées.

653. Can you demonstrate how to use this?
653. Peux-tu démontrer comment utiliser ça ?

654. I want to express my gratitude.
654. Je veux exprimer ma gratitude.

655. Do you know if breakfast is included?
655. Sais-tu si le petit-déjeuner est inclus ?

656. I think that this is incredibly difficult.
656. Je pense que c'est incroyablement difficile.

657. He doesn't know where he belongs.
657. Il ne sait pas où est sa place.

658. She's going to publish her research.
658. Elle va publier ses recherches.

659. I'm trying to reduce my expenses.
659. J'essaie de réduire mes dépenses.

660. Do you think that we should invest in this?
660. Penses-tu que nous devrions investir là-dedans ?

661. I don't know if this is permanent.
661. Je ne sais pas si c'est permanent.

662. He said that he admires your courage.
662. Il a dit qu'il admire ton courage.

663. She asked me to deliver this package.
663. Elle m'a demandé de livrer ce colis.

664. I want to expand my knowledge.
664. Je veux élargir mes connaissances.

665. Can you guarantee the quality?
665. Peux-tu garantir la qualité ?

666. I need to identify the problem.
666. J'ai besoin d'identifier le problème.

667. Do you know if there's a discount?
667. Sais-tu s'il y a une réduction ?

668. I think that this is the beginning of something great.
668. Je pense que c'est le début de quelque chose de grand.`;

async function parseAndInsert() {
  const lines = translations.split('\n').filter(line => line.trim());
  const seeds = [];

  for (let i = 0; i < lines.length; i += 2) {
    const knownLine = lines[i];
    const targetLine = lines[i + 1];

    if (!knownLine || !targetLine) continue;

    const knownMatch = knownLine.match(/^(\d+)\.\s+(.+)$/);
    const targetMatch = targetLine.match(/^(\d+)\.\s+(.+)$/);

    if (!knownMatch || !targetMatch) {
      console.error(`Parse error at line ${i}: ${knownLine}`);
      continue;
    }

    const seedNum = parseInt(knownMatch[1]);
    const knownText = knownMatch[2].trim();
    const targetText = targetMatch[2].trim();

    if (parseInt(targetMatch[1]) !== seedNum) {
      console.error(`Seed number mismatch at ${seedNum}`);
      continue;
    }

    seeds.push({
      course_code: 'fra_for_eng',
      seed_number: seedNum,
      known_text: knownText,
      target_text: targetText
    });
  }

  console.log(`Parsed ${seeds.length} translations (seeds 301-668)`);

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < seeds.length; i += 50) {
    const batch = seeds.slice(i, i + 50);
    const { data, error } = await supabase
      .from('course_seeds')
      .upsert(batch, {
        onConflict: 'course_code,seed_number'
      });

    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(seeds.length/50)}: seeds ${batch[0].seed_number}-${batch[batch.length-1].seed_number}`);
    }
  }

  console.log(`\n✅ Successfully inserted ${inserted} translations`);

  // Verify final count
  const { count, error: countError } = await supabase
    .from('course_seeds')
    .select('seed_number', { count: 'exact', head: true })
    .eq('course_code', 'fra_for_eng');

  if (countError) {
    console.error('Error counting seeds:', countError);
  } else {
    console.log(`Total seeds in fra_for_eng: ${count}`);
  }
}

parseAndInsert().catch(console.error);
