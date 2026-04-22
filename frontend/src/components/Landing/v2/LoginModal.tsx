import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PortalView } from "../PortalView";

export const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 overflow-hidden min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-md"
          >
            <button
              onClick={onClose}
              className="absolute -top-10 right-0 p-2 text-[#6b7280] hover:text-[#9ca3af] transition-colors"
            >
              <X size={24} />
            </button>
            <PortalView onLoginSuccess={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
