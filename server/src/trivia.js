import crypto from 'node:crypto'
import { z } from 'zod'
import { callGemini, geminiEnabled, parseJson } from './gemini.js'
import { triviaBank } from './data/trivia.js'

const QuestionSchema = z.object({
  question: z.string().min(5).max(300),
  options: z.array(z.string().min(1).max(120)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(300),
})
const QuizSchema = z.array(QuestionSchema).min(3)

// Answers stay on the server. The browser only gets questions + a quiz id.
const quizzes = new Map()
const TTL = 60 * 60 * 1000
function remember(questions) {
  const id = crypto.randomUUID()
  quizzes.set(id, { questions, at: Date.now() })
  for (const [k, v] of quizzes) if (Date.now() - v.at > TTL) quizzes.delete(k)
  return id
}
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5)

/**
 * Offline questions. Never mixes topics silently: a known topic only gets questions from that topic
 * (the chosen difficulty first, so there may be fewer than `count`); an unknown topic gets a general mix
 * and `matched` is false so the player is told.
 */
function fallbackQuestions(topic, difficulty, count) {
  const t = topic.toLowerCase()
  const same = triviaBank.filter((q) => q.topic.toLowerCase() === t)
  const matched = same.length > 0
  const pool = matched
    ? [...shuffle(same.filter((q) => q.difficulty === difficulty)), ...shuffle(same.filter((q) => q.difficulty !== difficulty))]
    : shuffle(triviaBank)
  const questions = pool.slice(0, count).map(({ question, options, answerIndex, explanation }) => {
    // shuffle options but keep track of the right answer
    const right = options[answerIndex]
    const opts = shuffle(options)
    return { question, options: opts, answerIndex: opts.indexOf(right), explanation }
  })
  return { questions, matched }
}

export async function createQuiz({ topic, difficulty, count }) {
  let questions, source = 'gemini', note
  try {
    const text = await callGemini({
      json: true,
      system: 'You write accurate multiple-choice trivia. Reply with JSON only.',
      prompt: `Write ${count} ${difficulty}-difficulty trivia questions about "${topic}". Return a JSON array. Each item: {"question": string, "options": [4 distinct strings], "answerIndex": 0-3, "explanation": short string}. Exactly one option must be correct and the facts must be well established.`,
    })
    questions = QuizSchema.parse(parseJson(text)).slice(0, count)
    // reject questions with duplicate options
    questions = questions.filter((q) => new Set(q.options).size === 4)
    if (questions.length < 3) throw new Error('Too few valid questions')
  } catch (err) {
    if (geminiEnabled()) console.warn('[trivia] Gemini failed, using fallback:', err.message)
    const fb = fallbackQuestions(topic, difficulty, count)
    questions = fb.questions
    source = 'fallback'
    if (!fb.matched) note = `No offline questions for "${topic}", so this is a general mix`
    else if (questions.length < count) note = `Offline bank has only ${questions.length} ${topic} questions`
  }
  const id = remember(questions)
  return { quizId: id, source, ...(note && { note }), questions: questions.map(({ question, options }) => ({ question, options })) }
}

export function checkAnswer({ quizId, index, choice }) {
  const quiz = quizzes.get(quizId)
  const q = quiz?.questions[index]
  if (!q) return null
  return { correct: choice === q.answerIndex, answerIndex: q.answerIndex, explanation: q.explanation }
}
