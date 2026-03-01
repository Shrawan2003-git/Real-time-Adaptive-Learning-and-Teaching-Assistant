import React from 'react';
import { GraduationCap, Github, Twitter, Linkedin, Heart } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center transform transition-transform hover:rotate-12 hover:scale-110 duration-300 shadow-md">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
                                EduGenie VTA
                            </span>
                        </div>
                        <p className="text-gray-500 leading-relaxed max-w-sm mb-6">
                            Redefining education with AI-powered personalized learning environments. Building the classroom of tomorrow, today.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300">
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-sm">Platform</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Teachers Dashboard</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Student Portal</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Live Classrooms</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Adaptive AI Exams</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-sm">Resources</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Documentation</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Help Center</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Privacy Policy</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-indigo-600 hover:translate-x-1 inline-block transition-transform duration-300">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                        © {new Date().getFullYear()} EduGenie VTA. Crafted with <Heart className="w-4 h-4 text-red-400 animate-pulse" /> for Education.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Systems Operational
                    </div>
                </div>
            </div>
        </footer>
    );
};
