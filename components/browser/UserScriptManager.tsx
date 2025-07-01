import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  UserScript,
  userScriptService,
} from "../../services/UserScriptService";

const { width, height } = Dimensions.get("window");

interface UserScriptManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function UserScriptManager({
  visible,
  onClose,
}: UserScriptManagerProps) {
  const [scripts, setScripts] = useState<UserScript[]>([]);
  const [selectedTab, setSelectedTab] = useState<
    "installed" | "editor" | "store"
  >("installed");
  const [selectedScript, setSelectedScript] = useState<UserScript | null>(null);
  const [editingScript, setEditingScript] = useState<string>("");
  const [scriptName, setScriptName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (visible) {
      loadScripts();

      const handleScriptUpdate = (updatedScripts: UserScript[]) => {
        setScripts(updatedScripts);
      };

      userScriptService.addListener(handleScriptUpdate);

      return () => {
        userScriptService.removeListener(handleScriptUpdate);
      };
    }
  }, [visible]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const allScripts = userScriptService.getScripts();
      setScripts(allScripts);
    } catch (error) {
      console.error("Failed to load scripts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter(
    (script) =>
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.author.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleScript = async (id: string, enabled: boolean) => {
    try {
      await userScriptService.setScriptEnabled(id, enabled);
    } catch (error) {
      console.error("Failed to toggle script:", error);
      Alert.alert("Error", "Failed to toggle script");
    }
  };

  const handleDeleteScript = async (id: string) => {
    Alert.alert(
      "Delete Script",
      "Are you sure you want to delete this script?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await userScriptService.deleteScript(id);
            } catch (error) {
              console.error("Failed to delete script:", error);
              Alert.alert("Error", "Failed to delete script");
            }
          },
        },
      ],
    );
  };

  const handleInstallScript = async () => {
    if (!editingScript.trim()) {
      Alert.alert("Error", "Please enter script code");
      return;
    }

    try {
      setLoading(true);
      await userScriptService.installScript(editingScript);
      setEditingScript("");
      setScriptName("");
      setSelectedTab("installed");
      Alert.alert("Success", "Script installed successfully");
    } catch (error) {
      console.error("Failed to install script:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to install script",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromUrl = async () => {
    Alert.prompt(
      "Import Script",
      "Enter the URL of the user script:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: async (url) => {
            if (!url) return;

            try {
              setLoading(true);
              await userScriptService.importScriptFromUrl(url);
              Alert.alert("Success", "Script imported successfully");
            } catch (error) {
              console.error("Failed to import script:", error);
              Alert.alert("Error", "Failed to import script from URL");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const renderScriptItem = (script: UserScript) => (
    <View key={script.id} style={styles.scriptItem}>
      <View style={styles.scriptHeader}>
        <View style={styles.scriptInfo}>
          <Text style={styles.scriptName}>
            {script.icon} {script.name}
          </Text>
          <Text style={styles.scriptAuthor}>
            by {script.author} v{script.version}
          </Text>
          <Text style={styles.scriptDescription}>{script.description}</Text>
          <Text style={styles.scriptStats}>
            Runs: {script.runCount} | Includes: {script.includes.join(", ")}
          </Text>
        </View>
        <View style={styles.scriptActions}>
          <Switch
            value={script.enabled}
            onValueChange={(enabled) => handleToggleScript(script.id, enabled)}
            thumbColor={script.enabled ? "#007AFF" : "#ccc"}
            trackColor={{ false: "#e0e0e0", true: "#007AFF30" }}
          />
        </View>
      </View>

      <View style={styles.scriptButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSelectedScript(script)}
        >
          <Text style={styles.actionButtonText}>View Code</Text>
        </TouchableOpacity>

        {!script.isBuiltIn && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteScript(script.id)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderInstalledTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search scripts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.scriptsList}>
        {loading ? (
          <Text style={styles.loadingText}>Loading scripts...</Text>
        ) : filteredScripts.length === 0 ? (
          <Text style={styles.emptyText}>No scripts found</Text>
        ) : (
          filteredScripts.map(renderScriptItem)
        )}
      </ScrollView>
    </View>
  );

  const renderEditorTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.editorHeader}>
        <TextInput
          style={styles.scriptNameInput}
          placeholder="Script name (optional)"
          value={scriptName}
          onChangeText={setScriptName}
        />

        <View style={styles.editorButtons}>
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportFromUrl}
          >
            <Text style={styles.importButtonText}>Import URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.installButton,
              !editingScript.trim() && styles.disabledButton,
            ]}
            onPress={handleInstallScript}
            disabled={!editingScript.trim() || loading}
          >
            <Text style={styles.installButtonText}>
              {loading ? "Installing..." : "Install"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.codeEditor}
        placeholder={`// ==UserScript==
// @name         My Script
// @description  Description of my script
// @author       Your name
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    // Your code here
    console.log('Hello from user script!');
})();`}
        value={editingScript}
        onChangeText={setEditingScript}
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  const renderStoreTab = () => (
    <View style={styles.tabContent}>
      <ScrollView style={styles.storeList}>
        <View style={styles.storeSection}>
          <Text style={styles.storeSectionTitle}>🔥 Popular Scripts</Text>

          <TouchableOpacity
            style={styles.storeItem}
            onPress={() => {
              setEditingScript(`// ==UserScript==
// @name         YouTube Ad Skipper
// @description  Automatically skip YouTube ads
// @author       Community
// @version      1.0.0
// @include      *youtube.com*
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    function skipAd() {
        // Skip button
        const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
        if (skipButton) {
            skipButton.click();
            console.log('YouTube ad skipped');
        }

        // Close overlay ads
        const closeButtons = document.querySelectorAll('.ytp-ad-overlay-close-button');
        closeButtons.forEach(btn => btn.click());
    }

    // Check every second
    setInterval(skipAd, 1000);
})();`);
              setSelectedTab("editor");
            }}
          >
            <Text style={styles.storeItemTitle}>🎬 YouTube Ad Skipper</Text>
            <Text style={styles.storeItemDescription}>
              Automatically skip YouTube ads
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.storeItem}
            onPress={() => {
              setEditingScript(`// ==UserScript==
// @name         Password Generator
// @description  Generate secure passwords for forms
// @author       VaiBrowser
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    function generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Add password generator button to password fields
    document.addEventListener('focusin', (e) => {
        if (e.target.type === 'password' && !e.target.nextSibling?.classList?.contains('pw-gen-btn')) {
            const button = document.createElement('button');
            button.textContent = '🔑';
            button.className = 'pw-gen-btn';
            button.style.cssText = 'margin-left: 5px; padding: 5px; border: 1px solid #ccc; background: #fff; cursor: pointer;';
            button.onclick = (event) => {
                event.preventDefault();
                e.target.value = generatePassword();
            };
            e.target.parentNode.insertBefore(button, e.target.nextSibling);
        }
    });
})();`);
              setSelectedTab("editor");
            }}
          >
            <Text style={styles.storeItemTitle}>🔑 Password Generator</Text>
            <Text style={styles.storeItemDescription}>
              Generate secure passwords for forms
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.storeItem}
            onPress={() => {
              setEditingScript(`// ==UserScript==
// @name         Image Zoom
// @description  Click to zoom images on any website
// @author       VaiBrowser
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            const overlay = document.createElement('div');
            overlay.style.cssText = \`
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            \`;

            const img = document.createElement('img');
            img.src = e.target.src;
            img.style.cssText = \`
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            \`;

            overlay.appendChild(img);
            overlay.onclick = () => document.body.removeChild(overlay);

            document.body.appendChild(overlay);
        }
    });
})();`);
              setSelectedTab("editor");
            }}
          >
            <Text style={styles.storeItemTitle}>🔍 Image Zoom</Text>
            <Text style={styles.storeItemDescription}>
              Click to zoom images on any website
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderCodeModal = () => (
    <Modal
      visible={!!selectedScript}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.codeModal}>
        <View style={styles.codeModalHeader}>
          <Text style={styles.codeModalTitle}>
            {selectedScript?.icon} {selectedScript?.name}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedScript(null)}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.codeContainer}>
          <Text style={styles.codeText}>{selectedScript?.code}</Text>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🐒 User Scripts</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === "installed" && styles.activeTab,
            ]}
            onPress={() => setSelectedTab("installed")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "installed" && styles.activeTabText,
              ]}
            >
              Installed ({scripts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "editor" && styles.activeTab]}
            onPress={() => setSelectedTab("editor")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "editor" && styles.activeTabText,
              ]}
            >
              Editor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "store" && styles.activeTab]}
            onPress={() => setSelectedTab("store")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "store" && styles.activeTabText,
              ]}
            >
              Script Store
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === "installed" && renderInstalledTab()}
        {selectedTab === "editor" && renderEditorTab()}
        {selectedTab === "store" && renderStoreTab()}

        {renderCodeModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8f8",
  },
  scriptsList: {
    flex: 1,
  },
  scriptItem: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scriptInfo: {
    flex: 1,
    marginRight: 12,
  },
  scriptName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  scriptAuthor: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  scriptDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  scriptStats: {
    fontSize: 12,
    color: "#888",
  },
  scriptActions: {
    justifyContent: "center",
  },
  scriptButtons: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
  },
  deleteButtonText: {
    color: "#fff",
  },
  loadingText: {
    textAlign: "center",
    padding: 20,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#666",
  },
  editorHeader: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  scriptNameInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#f8f8f8",
  },
  editorButtons: {
    flexDirection: "row",
    gap: 12,
  },
  importButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  importButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  installButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  installButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  codeEditor: {
    flex: 1,
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontFamily: "Courier New",
    fontSize: 12,
    textAlignVertical: "top",
  },
  storeList: {
    flex: 1,
  },
  storeSection: {
    padding: 16,
  },
  storeSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  storeItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storeItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  storeItemDescription: {
    fontSize: 14,
    color: "#666",
  },
  codeModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  codeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  codeModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  codeContainer: {
    flex: 1,
    padding: 16,
  },
  codeText: {
    fontFamily: "Courier New",
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
  },
});

