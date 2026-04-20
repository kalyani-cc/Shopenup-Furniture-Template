import { motion } from "motion/react"

export default function AvatarBox({ checked }: { checked?: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Logo Container */}
      <div className="relative mb-6">
        <motion.div
          className="bg-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img 
            src="/app/logo_blue.svg" 
            alt="Shopenup Logo" 
            className="w-64 h-24 object-contain"
          />
        </motion.div>
        
        {checked && (
          <motion.div
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-green-500 border-2 border-white shadow-lg"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.3,
              ease: [0, 0.71, 0.2, 1.01],
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="none"
            >
              <motion.path
                d="M5.8335 10.4167L9.16683 13.75L14.1668 6.25"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.5,
                  ease: [0.1, 0.8, 0.2, 1.01],
                }}
              />
            </svg>
          </motion.div>
        )}
      </div>
    </div>
  )
}