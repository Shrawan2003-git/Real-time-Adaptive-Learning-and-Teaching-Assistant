import React from 'react';
import { GraduationCap, Github, Linkedin, Heart, Mail } from 'lucide-react';

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
                                VTA
                            </span>
                        </div>
                        <p className="text-gray-500 leading-relaxed max-w-sm mb-6">
                            Redefining education with AI-powered personalized learning environments. Building the classroom of tomorrow, today.
                        </p>
                        <div className="flex gap-4">
                            {/* LinkedIn */}
                            <a href="http://www.linkedin.com/in/shrawan-gautam-070429247" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300" title="LinkedIn">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            {/* GitHub */}
                            <a href="https://github.com/Shrawan2003-git" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300" title="GitHub">
                                <Github className="w-5 h-5" />
                            </a>
                            {/* Email */}
                            <a href="mailto:shrawangautam01112003@gmail.com" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-1 transition-all duration-300" title="Email">
                                <Mail className="w-5 h-5" />
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



                {/* Made by + Copyright bar */}
                <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm flex items-center gap-1.5">
                        © {new Date().getFullYear()} VTA. Crafted with <Heart className="w-4 h-4 text-red-400 animate-pulse" /> for Education.
                    </p>

                    {/* Made by Shrawan Gautam */}
                    <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-inner shrink-0">
                            <span className="text-white text-xs font-extrabold">SG</span>
                        </div>
                        <span className="text-sm text-gray-500">Made by</span>
                        <span className="text-sm font-bold text-indigo-700 group-hover:text-indigo-900 transition-colors">Shrawan Gautam</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Systems Operational
                    </div>
                </div>
            </div>
        </footer>
    );
};
