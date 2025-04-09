import { useState } from "react";
import { Paperclip } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! How can I help you?", sender: "bot" }
  ]);
  console.log(messages)
  const [input, setInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const botMessage: Message = { id: Date.now() + 1, text: data.response, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPDF = async () => {
    if (!file) {
      console.log("No file selected");
      return;
    }
  
    console.log("Uploading file:", file.name);
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
  
    try {
      const res = await fetch("http://localhost:5000/api/pdf/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      console.log("Server response:", data);
  
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), text: "📄 PDF успішно завантажено. Інформація тепер доступна!", sender: "bot" },
        ]);
      } else {
        console.error("No success message in response:", data);
      }
  
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };  

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[65vh] w-[80vw] max-w-5xl mx-auto my-10 p-6 bg-white shadow-lg rounded-lg border border-gray-300">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100 rounded-lg">
        {messages.map((msg) => (
          <div key={msg.id} className={`max-w-[80%] p-3 rounded-lg break-words ${msg.sender === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-300"}`}>
            {msg.text}
          </div>
        ))}
        {file && (
          <div className="p-3 bg-gray-200 rounded-lg text-sm text-gray-700">
            Attached file: {file.name} 
            <button 
              onClick={uploadPDF} 
              className="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Upload
            </button>
          </div>
        )}
        {loading && <p className="text-center text-gray-500">Loading...</p>}
      </div>
      <div className="flex items-center mt-4 gap-2 border-t pt-4">
        <label className="cursor-pointer flex items-center gap-2 p-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition">
          <Paperclip className="w-5 h-5 text-gray-700" />
          <input type="file" className="hidden" onChange={handleFileChange} />
        </label>
        <input
          type="text"
          className="flex-1 border rounded-full p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}