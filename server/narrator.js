'use strict';

// ─── Narrator lines ───────────────────────────────────────────────────────────
// Voice: warm, slightly snarky, always rooting for the pair.

const NARRATOR_LINES = {
  1: {
    intro:
      "Ah, so you've found each other. Two paper dolls, stumbling into the same story. Don't worry — the forest is patient. It's seen clumsier beginnings.",

    betweenGames: [
      "Not bad. I've seen worse. (I have not seen worse.)",
      "One game down. The trees are whispering your names — probably gossiping.",
      "You're starting to move like you actually like each other. Suspicious.",
      "Keep it up. The butterflies are cautiously optimistic.",
    ],

    afterBoss:
      "You made it through the labyrinth. Together. The forest exhales. A single thread, woven between you, begins to glow.",

    outro:
      "Chapter one, closed. The first thread holds. Go rest — the kitchen fires are already lit.",
  },

  2: {
    intro:
      "Ah, the kitchen. Where good intentions meet poor timing. You'll need to share this space, every tool, every flame. Try not to burn it down.",

    betweenGames: [
      "The sprouts are growing. Either you two are naturals, or the dirt feels sorry for you.",
      "Stirring together — sounds simple. Isn't. You're doing it anyway. I respect that.",
      "The heartbeats are… closer than before. I didn't say anything. I just noticed.",
    ],

    afterBoss:
      "The dish is done. It tastes like something that required two people to make. A charm appears, small and warm, smelling faintly of cardamom.",

    outro:
      "Chapter two, plated and served. Whatever you made in that kitchen — it wasn't just food.",
  },

  3: {
    intro:
      "Welcome to the workshop. It smells like sawdust and ambition. The machines here only run when both of you agree they should.",

    betweenGames: [
      "The gears are turning. They were waiting for someone to care enough.",
      "Blueprint reading — the art of both people thinking they understand it and neither one admitting they don't.",
      "You typed that in tandem. On purpose. I'm almost moved.",
    ],

    afterBoss:
      "The Rube Goldberg fires. The marble rolls. The domino falls. The window opens. It works. Of course it works — you built it together.",

    outro:
      "Chapter three, assembled. The workshop remembers every hand that touched it. Now it remembers yours.",
  },

  4: {
    intro:
      "The concert hall. Even the silence here is performative. Music isn't made alone — it never really was.",

    betweenGames: [
      "Call and response. You answered. That means more than you know.",
      "You followed the conductor. Or maybe you became the conductor. Hard to say from here.",
      "The mirror drawing… I watched you watch each other. I'll let that sit.",
    ],

    afterBoss:
      "The duet ends. The final chord hangs in the air longer than it should — as if the room doesn't want to let it go.",

    outro:
      "Chapter four, curtain down. You played the music that two people make when they stop being afraid to listen.",
  },

  5: {
    intro:
      "The storm doesn't care about your feelings. It only cares whether you can hear each other over the noise. Lucky you've been practicing.",

    betweenGames: [
      "You lit the way. Not just the physical light. I mean that metaphorically. Don't look at me like that.",
      "Flags in a storm — communication reduced to its purest form. You passed.",
      "The tide pools don't forgive mistakes. You made some anyway. So did everyone who ever came before you.",
    ],

    afterBoss:
      "The storm breaks. Not because you were strong enough — because you stayed close enough. A charm surfaces from the receding water.",

    outro:
      "Chapter five, survived. Some things are only possible in the middle of something terrible. You found one.",
  },

  6: {
    intro:
      "The summit. You didn't come this far by accident. The final labyrinth awaits — bigger than the first, but you are not the same people who stumbled into the forest.",

    betweenGames: [
      "The dice fall where they will. You adapt. That's who you are now.",
      "Memory lane — you remembered things about each other I didn't expect you to. Neither did you.",
      "Twenty questions. You've been answering questions about each other this whole journey. This one just has rules.",
    ],

    afterBoss:
      "The final labyrinth opens its last door. Beyond it: not an ending, but a clearing. Light. The kind that comes after.",

    outro:
      "Six chapters, complete. The charms hang between you — a whole story told in small bright things. You started as two paper dolls. You finish as something harder to name. Which is the only ending worth having.",
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Retrieve a narrator line.
 *
 * @param {number} chapter        – 1–6
 * @param {'intro'|'betweenGames'|'afterBoss'|'outro'} phase
 * @param {number} [index]        – for betweenGames array (0-based)
 * @returns {string|null}
 */
function getNarratorLine(chapter, phase, index = 0) {
  const chapterLines = NARRATOR_LINES[chapter];
  if (!chapterLines) return null;

  const line = chapterLines[phase];
  if (!line) return null;

  if (Array.isArray(line)) {
    return line[Math.min(index, line.length - 1)] || null;
  }

  return line;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { NARRATOR_LINES, getNarratorLine };
