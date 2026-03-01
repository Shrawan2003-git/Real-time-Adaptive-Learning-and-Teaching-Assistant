
import { LessonData } from '../types';

export const DEMO_LESSON: LessonData = {
    topic: "Introduction to Artificial Intelligence",
    level: "High School",
    summary: "Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction. Particular applications of AI include expert systems, speech recognition, and machine vision. AI can be categorized as either weak or strong. Weak AI, also known as narrow AI, is an AI system that is designed and trained for a particular task. Virtual personal assistants, such as Apple's Siri, are a form of weak AI. Strong AI, also known as artificial general intelligence, is an AI system with generalized human cognitive abilities. When presented with an unfamiliar task, a strong AI system is able to find a solution without human intervention.",
    keyPoints: [
        "AI simulates human intelligence in machines.",
        "Key processes: Learning, Reasoning, Self-correction.",
        "Applications: Vision, Speech, Decision making.",
        "Types: Narrow AI (Weak) vs. General AI (Strong)."
    ],
    imagePrompt: "A futuristic illustration of a digital brain glowing with neural networks, connected to symbols of various industries like healthcare, finance, and transportation, representing Artificial Intelligence.",
    imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop", // Reliable Unsplash Image for Demo
    quiz: [
        {
            question: "What are the three main processes simulated by AI?",
            options: [
                "Learning, Reasoning, Self-correction",
                "Coding, Compiling, Executing",
                "Input, Processing, Output",
                "Reading, Writing, Arithmetic"
            ],
            correctAnswer: 0,
            hint: "Think about how a human mind adapts and solves problems."
        },
        {
            question: "Which type of AI is designed for a specific task?",
            options: [
                "Strong AI",
                "General AI",
                "Weak (Narrow) AI",
                "Super AI"
            ],
            correctAnswer: 2,
            hint: "It acts 'narrowly' on one specific domain, like Siri or a chess bot."
        },
        {
            question: "True or False: Strong AI can solve unfamiliar tasks without human intervention.",
            options: [
                "True",
                "False"
            ],
            correctAnswer: 0,
            hint: "Strong AI implies generalized cognitive abilities similar to a human."
        }
    ]
};
