const uuidService = require('../services/uuid-service.cjs');

// The 6 new presentation texts (ese niño is after seed 250)
const presentations = [
  {
    name: 'no estoy seguro',
    text: "The Spanish for 'I'm not sure', as in 'I'm not sure if I can remember the whole sentence.', is: ... 'no estoy seguro' - In Spanish, men and women say some words slightly differently when referring to themselves. If you listen closely, you will hear the female voice saying it one way, and the male voice saying it another way."
  },
  {
    name: 'estuviera casi preparado',
    text: "The Spanish for 'I were nearly ready', as in 'I like feeling as if I'm nearly ready to go.', is: ... 'estuviera casi preparado' ... 'estuviera casi preparado' - Here we have another one of those words that change based on gender. Since the speakers are referring to themselves, you'll heard them pronounce the end of the word slightly differently from each other. Don't worry about this as it'll come naturally to you, but do listen out for it from now on."
  },
  {
    name: 'con mis amigos',
    text: "The Spanish for 'with my friends', as in 'I enjoy doing interesting things with my friends.', is: ... 'con mis amigos' ... 'con mis amigos' - In Spanish, similarly to when referring to yourself, some words can change slightly based on who you're referring to. When referring to male friends or a mixed group of friends, you'll hear it with an 'o' at the end, and when referring to female friends you'll hear 'a' at the end. Both speakers could use either one based on who they're talking about, but to get you used to hearing both, we'll have the female voice refer to female friends and the male voice refer to male friends."
  },
  {
    name: 'a su amigo',
    text: "The Spanish for 'to his friend', as in 'He wanted to write a letter to his friend last week.', is: ... 'a su amigo' ... 'a su amigo' - just like with the plural, the female voice will usually refer to a female friend and a male voice will refer to a male friend. Listen out for the difference, but don't worry about it!"
  },
  {
    name: 'estás seguro',
    text: "The Spanish for 'are you sure', as in 'Are you sure you don't mind helping me?', is: ... 'estás seguro' ... 'estás seguro' - You might have noticed this is one of those words that change based on gender. When you're referring to someone else, the word will change based on their gender rather than yours. Like with when we talked about friends, we'll have the female voice speak as if she's talking to a female friend, and the male voice speak as if he's talking to a male friend, just to give you practice hearing both variations. You can say whichever pops into your head first."
  },
  {
    name: 'Pienso que estás',
    text: "The Spanish for 'I think that you're', as in 'I think that you're doing very well.', is: ... 'Pienso que estás' ... 'Pienso que estás' - Since you'll be referring to someone else, listen out for any words where you hear the gender difference!"
  }
];

// Presentation voice from voices.json
const voiceId = 'elevenlabs_FOIN928B9X0jwgJ95cLt';

console.log('=== UUIDs for Gender Explanation Presentations ===\n');

presentations.forEach(p => {
  const uuid = uuidService.generateSampleUUID(p.text, 'eng', 'presentation', 'natural', voiceId);
  console.log(p.name + ':');
  console.log('  UUID: ' + uuid);
  console.log();
});
