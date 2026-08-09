'use client';

import React from 'react';

interface VisualProps {
  exerciseId: string;
  className?: string;
}

/**
 * High-quality vector illustration component of an Indian Female Subject
 * performing Vertigo Rehabilitation exercises.
 */
export const IndianFemaleExerciseAvatar: React.FC<VisualProps> = ({ exerciseId, className = 'w-full h-full' }) => {
  switch (exerciseId) {
    case 'vor-x1-horizontal':
      // Head side to side with arm outstretched and thumb target
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#EDF2F7" />
          
          {/* Background motion trails */}
          <path d="M70 140 C 90 90, 230 90, 250 140" stroke="#0EA5E9" strokeWidth="3" strokeDasharray="6 6" fill="none" />
          <path d="M50 160 Q 160 110 270 160" stroke="#38BDF8" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M90 140 L70 140 L75 155" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M230 140 L250 140 L245 155" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Indian Female Subject - Bust/Head Side View Shadows */}
          <g opacity="0.25" transform="translate(-45, 10)">
            <ellipse cx="160" cy="130" rx="42" ry="52" fill="#78350F" />
            <path d="M120 220 C120 180, 200 180, 200 220 L210 320 L110 320 Z" fill="#64748B" />
          </g>
          <g opacity="0.25" transform="translate(45, 10)">
            <ellipse cx="160" cy="130" rx="42" ry="52" fill="#78350F" />
            <path d="M120 220 C120 180, 200 180, 200 220 L210 320 L110 320 Z" fill="#64748B" />
          </g>

          {/* Center Indian Female Subject - Main Frontal/Quarter View */}
          {/* Sweater body */}
          <path d="M100 250 C100 200, 220 200, 220 250 L235 320 L85 320 Z" fill="#94A3B8" />
          {/* Collared shirt */}
          <path d="M135 200 L160 225 L185 200 L170 195 L160 205 L150 195 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          {/* Neck */}
          <path d="M148 165 L172 165 L175 205 L145 205 Z" fill="#B45309" />
          {/* Face - Warm Indian Skin Tone */}
          <ellipse cx="160" cy="135" rx="44" ry="54" fill="#D97706" />
          {/* Ears & Earrings */}
          <ellipse cx="114" cy="138" rx="7" ry="11" fill="#B45309" />
          <ellipse cx="206" cy="138" rx="7" ry="11" fill="#B45309" />
          <circle cx="114" cy="151" r="3" fill="#F59E0B" />
          <circle cx="206" cy="151" r="3" fill="#F59E0B" />
          {/* Hair - Dark Ponytail */}
          <path d="M116 125 C116 80, 204 80, 204 125 C204 110, 190 95, 160 95 C130 95, 116 110, 116 125 Z" fill="#1E293B" />
          <path d="M160 90 C130 90, 118 105, 116 130 C125 110, 145 102, 160 102 C175 102, 195 110, 204 130 C202 105, 190 90, 160 90 Z" fill="#0F172A" />
          {/* Ponytail back */}
          <path d="M200 130 C225 140, 235 170, 220 200 C210 180, 205 150, 196 135 Z" fill="#0F172A" />
          {/* Bindi */}
          <circle cx="160" cy="120" r="2.5" fill="#DC2626" />
          {/* Eyes - Focused forward */}
          <ellipse cx="143" cy="133" rx="6" ry="4" fill="#FFFFFF" />
          <ellipse cx="177" cy="133" rx="6" ry="4" fill="#FFFFFF" />
          <circle cx="143" cy="133" r="3" fill="#0F172A" />
          <circle cx="177" cy="133" r="3" fill="#0F172A" />
          {/* Eyebrows */}
          <path d="M134 125 Q143 122 150 126" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M170 126 Q177 122 186 125" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Nose & Mouth */}
          <path d="M160 133 L158 144 L164 144" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M152 155 Q160 160 168 155" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Outstretched Hand with Upright Thumb Target */}
          <g transform="translate(130, 180)">
            <path d="M20 70 L30 30 L42 30 L45 70 Z" fill="#D97706" />
            <path d="M25 32 L25 10 C25 4, 35 4, 35 10 L35 32 Z" fill="#B45309" />
            <circle cx="30" cy="8" r="4" fill="#EF4444" opacity="0.8" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Head side to side</text>
        </svg>
      );

    case 'vor-x1-vertical':
      // Head up and down with vertical arrows
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#F0F9FF" />

          {/* Motion Curved Arrows Up & Down */}
          <path d="M245 80 Q265 150 245 220" stroke="#0EA5E9" strokeWidth="4" strokeDasharray="6 6" fill="none" />
          <path d="M245 80 L235 95 M245 80 L260 95" stroke="#0EA5E9" strokeWidth="4" strokeLinecap="round" />
          <path d="M245 220 L235 205 M245 220 L260 205" stroke="#0EA5E9" strokeWidth="4" strokeLinecap="round" />

          {/* Indian Female Subject - Profile / Semi-profile up & down */}
          <g opacity="0.3" transform="translate(0, -35)">
            <ellipse cx="140" cy="135" rx="42" ry="50" fill="#78350F" />
            <path d="M80 230 C80 190, 200 190, 200 230 L210 300 L70 300 Z" fill="#94A3B8" />
          </g>
          <g opacity="0.3" transform="translate(0, 35)">
            <ellipse cx="140" cy="135" rx="42" ry="50" fill="#78350F" />
            <path d="M80 230 C80 190, 200 190, 200 230 L210 300 L70 300 Z" fill="#94A3B8" />
          </g>

          {/* Main Subject */}
          <path d="M80 240 C80 190, 200 190, 200 240 L210 320 L70 320 Z" fill="#64748B" />
          <path d="M115 195 L140 220 L165 195 L150 190 L140 200 L130 190 Z" fill="#FFFFFF" />
          <path d="M128 160 L152 160 L155 200 L125 200 Z" fill="#B45309" />
          <ellipse cx="140" cy="135" rx="44" ry="52" fill="#D97706" />
          {/* Hair Ponytail */}
          <path d="M96 125 C96 80, 184 80, 184 125 C184 110, 170 95, 140 95 C110 95, 96 110, 96 125 Z" fill="#1E293B" />
          <path d="M90 135 C70 145, 60 175, 75 205 C85 185, 90 155, 98 140 Z" fill="#0F172A" />
          {/* Bindi & Facial details */}
          <circle cx="140" cy="118" r="2.5" fill="#DC2626" />
          <ellipse cx="125" cy="132" rx="5" ry="4" fill="#FFFFFF" />
          <ellipse cx="155" cy="132" rx="5" ry="4" fill="#FFFFFF" />
          <circle cx="125" cy="132" r="2.5" fill="#0F172A" />
          <circle cx="155" cy="132" r="2.5" fill="#0F172A" />
          <path d="M118 124 Q125 120 132 124" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M148 124 Q155 120 162 124" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M134 153 Q140 157 146 153" stroke="#991B1B" strokeWidth="2.5" fill="none" />

          {/* Target Dot */}
          <circle cx="210" cy="135" r="8" fill="#EF4444" />
          <circle cx="210" cy="135" r="16" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" fill="none" />

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Head up and down</text>
        </svg>
      );

    case 'cawthorne-diagonal':
    case 'head-45-degree':
      // 45 degree head tilt
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#FEF3C7" opacity="0.5" />

          {/* 45 degree angle arc */}
          <path d="M160 160 L230 90" stroke="#F59E0B" strokeWidth="3" strokeDasharray="4 4" />
          <path d="M160 160 L160 80" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M160 110 A 50 50 0 0 1 195 125" stroke="#D97706" strokeWidth="3" fill="none" />
          <text x="185" y="110" fill="#B45309" fontSize="12" fontWeight="800">45°</text>

          {/* Subject Head tilted 45 deg */}
          <g transform="translate(10, 20) rotate(22, 160, 140)">
            <path d="M90 240 C90 190, 230 190, 230 240 L240 320 L80 320 Z" fill="#64748B" />
            <path d="M138 165 L162 165 L165 205 L135 205 Z" fill="#B45309" />
            <ellipse cx="160" cy="135" rx="44" ry="52" fill="#D97706" />
            <path d="M116 125 C116 80, 204 80, 204 125 C204 110, 190 95, 160 95 C130 95, 116 110, 116 125 Z" fill="#1E293B" />
            <circle cx="160" cy="118" r="2.5" fill="#DC2626" />
            <ellipse cx="145" cy="132" rx="5" ry="4" fill="#FFFFFF" />
            <ellipse cx="175" cy="132" rx="5" ry="4" fill="#FFFFFF" />
            <circle cx="145" cy="132" r="2.5" fill="#0F172A" />
            <circle cx="175" cy="132" r="2.5" fill="#0F172A" />
            <path d="M154 153 Q160 157 166 153" stroke="#991B1B" strokeWidth="2.5" fill="none" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Head 45 degree</text>
        </svg>
      );

    case 'eyes-focus-finger':
    case 'eye-roll-up-down':
    case 'eye-alternate-left-right':
      // Eyes focus on finger / ocular tracking
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#ECFDF5" />

          {/* Profile Indian Female Subject looking at finger */}
          <path d="M60 250 C60 190, 160 190, 160 250 L170 320 L50 320 Z" fill="#475569" />
          <path d="M90 160 L110 160 L112 205 L88 205 Z" fill="#B45309" />
          {/* Profile Face */}
          <path d="M90 90 C120 90, 135 110, 135 135 C135 145, 145 148, 140 155 C135 160, 125 175, 100 175 C85 175, 80 155, 80 135 Z" fill="#D97706" />
          {/* Nose profile */}
          <path d="M125 125 L142 135 L130 142 Z" fill="#D97706" />
          <path d="M130 148 C138 148, 138 153, 130 155 Z" fill="#B45309" />
          {/* Hair ponytail */}
          <path d="M85 90 C60 90, 55 120, 60 150 C50 160, 30 150, 25 130 C20 110, 45 90, 70 85 Z" fill="#0F172A" />
          {/* Eye focused on finger */}
          <ellipse cx="120" cy="125" rx="6" ry="4" fill="#FFFFFF" />
          <circle cx="122" cy="125" r="3" fill="#0F172A" />
          <path d="M112 118 Q120 114 128 118" stroke="#0F172A" strokeWidth="2" fill="none" />

          {/* Hand coming in from right with finger pointing towards face */}
          <g transform="translate(170, 110)">
            <path d="M80 50 L30 25 L10 25 C5 25, 5 15, 10 15 L35 15 L80 30 Z" fill="#D97706" />
            {/* Motion arrow towards/away face */}
            <path d="M-20 20 L20 20" stroke="#10B981" strokeWidth="3" strokeDasharray="4 4" />
            <path d="M-20 20 L-10 12 M-20 20 L-10 28" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
            <path d="M20 20 L10 12 M20 20 L10 28" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Eyes focus on finger</text>
        </svg>
      );

    case 'standing-exercise':
      // Standing posture eyes open/shut
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#EFF6FF" />

          {/* Full standing Indian Female Subject */}
          <g transform="translate(20, -10)">
            {/* Hair ponytail */}
            <path d="M140 40 C125 40, 120 60, 120 80 Z" fill="#0F172A" />
            {/* Head */}
            <ellipse cx="140" cy="55" rx="18" ry="22" fill="#D97706" />
            <circle cx="140" cy="48" r="1.5" fill="#DC2626" />
            {/* Torso & Sweater */}
            <path d="M120 80 L160 80 L165 160 L115 160 Z" fill="#64748B" />
            {/* Arms at side */}
            <path d="M112 85 L108 160 L118 160 L122 85 Z" fill="#475569" />
            <path d="M168 85 L172 160 L162 160 L158 85 Z" fill="#475569" />
            {/* Jeans / Legs feet together */}
            <path d="M120 160 L138 160 L136 265 L122 265 Z" fill="#1E3A8A" />
            <path d="M142 160 L160 160 L158 265 L144 265 Z" fill="#1E3A8A" />
            {/* Shoes */}
            <path d="M118 265 L138 265 L138 275 L114 275 Z" fill="#0F172A" />
            <path d="M142 265 L162 265 L166 275 L142 275 Z" fill="#0F172A" />
          </g>

          {/* Eye Icon Open & Closed indicator */}
          <g transform="translate(220, 90)">
            <rect width="60" height="70" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="30" cy="25" r="12" fill="#3B82F6" opacity="0.2" />
            {/* Eye open */}
            <ellipse cx="30" cy="25" rx="8" ry="5" stroke="#1E40AF" strokeWidth="2" fill="none" />
            <circle cx="30" cy="25" r="3" fill="#1E40AF" />
            {/* Eye closed */}
            <path d="M20 50 Q30 58 40 50" stroke="#64748B" strokeWidth="2" fill="none" />
            <path d="M23 54 L20 58 M30 55 L30 60 M37 54 L40 58" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Standing exercise</text>
        </svg>
      );

    case 'sitting-up-and-down':
      // Sit to stand movement
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#FAF5FF" />

          {/* Chair */}
          <path d="M180 180 L230 180 L230 270 L215 270 L215 220 L195 220 L195 270 L180 270 Z" fill="#78350F" />

          {/* Seated Indian Female Subject */}
          <g transform="translate(40, 20)">
            <ellipse cx="140" cy="95" rx="18" ry="22" fill="#D97706" />
            <path d="M125 78 C115 78, 110 90, 110 110 Z" fill="#0F172A" />
            <circle cx="140" cy="88" r="1.5" fill="#DC2626" />
            {/* Sitting posture sweater */}
            <path d="M120 120 L160 120 L155 190 L115 190 Z" fill="#64748B" />
            {/* Bent knees / jeans */}
            <path d="M115 190 L175 190 L175 250 L155 250 L155 210 L115 210 Z" fill="#1E3A8A" />
            {/* Shoes */}
            <path d="M155 250 L185 250 L185 260 L150 260 Z" fill="#0F172A" />
          </g>

          {/* Up and Down motion arrow */}
          <path d="M80 100 L80 220" stroke="#9333EA" strokeWidth="4" strokeDasharray="5 5" />
          <path d="M80 100 L70 115 M80 100 L90 115" stroke="#9333EA" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 220 L70 205 M80 220 L90 205" stroke="#9333EA" strokeWidth="4" strokeLinecap="round" />

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Sitting up and down</text>
        </svg>
      );

    case 'walking-flat-surface':
      // Walking on flat surface
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#F0FDF4" />

          {/* Floor line */}
          <line x1="40" y1="260" x2="280" y2="260" stroke="#94A3B8" strokeWidth="3" />

          {/* Walking Subject */}
          <g transform="translate(30, 0)">
            <ellipse cx="140" cy="75" rx="18" ry="22" fill="#D97706" />
            <path d="M125 58 C115 58, 110 70, 110 90 Z" fill="#0F172A" />
            <circle cx="140" cy="68" r="1.5" fill="#DC2626" />
            <path d="M120 100 L160 100 L155 170 L115 170 Z" fill="#64748B" />
            {/* Walking stride leg stance */}
            <path d="M120 170 L100 255 L118 255 L135 170 Z" fill="#1E3A8A" />
            <path d="M140 170 L170 255 L188 255 L155 170 Z" fill="#1E3A8A" />
            <path d="M90 255 L120 255 L120 262 L90 262 Z" fill="#0F172A" />
            <path d="M165 255 L195 255 L195 262 L165 262 Z" fill="#0F172A" />
          </g>

          {/* Forward movement line */}
          <path d="M60 275 L260 275" stroke="#16A34A" strokeWidth="3" strokeDasharray="6 6" />
          <path d="M260 275 L245 268 M260 275 L245 282" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Walking on a flat surface</text>
        </svg>
      );

    case 'walking-uneven-surface':
      // Cushion / steps walking
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#FFF7ED" />

          {/* Soft cushion / foam mat */}
          <path d="M70 240 Q160 230 250 240 L260 265 Q160 275 60 265 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="2" />
          <path d="M90 245 Q160 238 230 245" stroke="#F97316" strokeWidth="2" strokeDasharray="4 4" fill="none" />

          {/* Subject balancing on cushion */}
          <g transform="translate(20, -20)">
            <ellipse cx="140" cy="75" rx="18" ry="22" fill="#D97706" />
            <path d="M125 58 C115 58, 110 70, 110 90 Z" fill="#0F172A" />
            <circle cx="140" cy="68" r="1.5" fill="#DC2626" />
            <path d="M120 100 L160 100 L155 170 L115 170 Z" fill="#64748B" />
            {/* Outstretched balance arms */}
            <path d="M80 110 L120 105 L120 120 L75 125 Z" fill="#475569" />
            <path d="M160 105 L200 110 L205 125 L160 120 Z" fill="#475569" />
            {/* Legs on cushion */}
            <path d="M120 170 L125 255 L140 255 L135 170 Z" fill="#1E3A8A" />
            <path d="M140 170 L150 255 L165 255 L155 170 Z" fill="#1E3A8A" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Walking on an uneven surface</text>
        </svg>
      );

    case 'walking-heel-to-toe':
      // Tandem walking
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#F0FDFA" />

          {/* Straight line on floor */}
          <line x1="160" y1="40" x2="160" y2="270" stroke="#0D9488" strokeWidth="4" strokeDasharray="6 6" />

          {/* Tandem Footprints Heel-to-toe */}
          <g transform="translate(135, 170)">
            {/* Back foot */}
            <ellipse cx="25" cy="70" rx="8" ry="18" fill="#115E59" />
            {/* Front foot touching heel */}
            <ellipse cx="25" cy="30" rx="8" ry="18" fill="#0D9488" />
            {/* Arrow indicating heel touching toe */}
            <path d="M40 70 C50 50, 50 40, 40 30" stroke="#14B8A6" strokeWidth="2" strokeDasharray="2 2" fill="none" />
          </g>

          {/* Full posture side/front */}
          <g transform="translate(-30, -30)">
            <ellipse cx="140" cy="75" rx="16" ry="20" fill="#D97706" />
            <path d="M120 100 L160 100 L155 170 L115 170 Z" fill="#64748B" />
            {/* Arms crossed on chest */}
            <path d="M115 105 Q140 140 165 105" stroke="#334155" strokeWidth="8" fill="none" />
            {/* Tandem legs */}
            <path d="M130 170 L135 250 L145 250 L140 170 Z" fill="#1E3A8A" />
          </g>

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Walking heel-to-toe</text>
        </svg>
      );

    case 'sit-and-lean-exercise':
      // Sit and lean forward / object pick up
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#FEF2F2" />

          {/* Chair */}
          <path d="M60 180 L110 180 L110 270 L95 270 L95 220 L75 220 L75 270 L60 270 Z" fill="#78350F" />

          {/* Forward leaning posture reaching down */}
          <g transform="translate(40, 60)">
            {/* Leaning head */}
            <ellipse cx="140" cy="110" rx="16" ry="20" fill="#D97706" />
            {/* Torso angled forward */}
            <path d="M80 110 L130 110 L150 160 L100 160 Z" fill="#64748B" />
            {/* Arm reaching down to object */}
            <path d="M130 120 L160 180 L150 185 L120 125 Z" fill="#475569" />
            {/* Object on floor (ball/cup) */}
            <circle cx="170" cy="195" r="10" fill="#EF4444" />
          </g>

          {/* Curved motion arc */}
          <path d="M130 110 Q190 120 200 180" stroke="#DC2626" strokeWidth="3" strokeDasharray="4 4" fill="none" />

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Sit and lean exercise</text>
        </svg>
      );

    case 'rolling-exercise':
    default:
      // Bed roll / Brandt-Daroff repositioning maneuver
      return (
        <svg viewBox="0 0 320 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="320" rx="16" fill="#F8FAFC" />
          <circle cx="160" cy="160" r="140" fill="#F1F5F9" />

          {/* Bed mattress */}
          <rect x="40" y="190" width="240" height="40" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <line x1="40" y1="230" x2="40" y2="260" stroke="#475569" strokeWidth="4" />
          <line x1="280" y1="230" x2="280" y2="260" stroke="#475569" strokeWidth="4" />

          {/* Subject lying sideways on bed with head turned */}
          <g transform="translate(20, 55)">
            {/* Body reclining on side */}
            <path d="M60 145 C60 130, 180 135, 220 145 L220 170 L60 170 Z" fill="#64748B" />
            {/* Legs on bed */}
            <path d="M170 145 L240 145 L240 165 L170 165 Z" fill="#1E3A8A" />
            {/* Head resting on pillow */}
            <ellipse cx="75" cy="140" rx="16" ry="20" fill="#D97706" />
            <path d="M60 130 C50 130, 45 140, 50 155 Z" fill="#0F172A" />
          </g>

          {/* Roll arrow indicator */}
          <path d="M100 130 Q160 80 220 130" stroke="#2563EB" strokeWidth="4" strokeDasharray="5 5" fill="none" />
          <path d="M220 130 L205 120 M220 130 L210 142" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />

          <text x="160" y="305" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="700">Rolling exercise</text>
        </svg>
      );
  }
};
