#!/bin/bash

echo "🚀 Démarrage de l'automatisation du déploiement Supabase sur Google Cloud..."

# 1. Vérification de gcloud
if ! command -v gcloud &> /dev/null
then
    echo "L'outil gcloud n'est pas installé. Téléchargement en cours..."
    curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-arm.tar.gz
    tar -xf google-cloud-cli-darwin-arm.tar.gz
    ./google-cloud-sdk/install.sh --quiet
    source ./google-cloud-sdk/path.bash.inc
    echo "✅ gcloud installé ! Veuillez redémarrer votre terminal après l'exécution de ce script."
fi

# 2. Authentification et sélection du projet
echo "🔑 Veuillez vous connecter à votre compte Google Cloud."
gcloud auth login
echo "📌 Entrez votre ID de projet Google Cloud :"
read PROJECT_ID
gcloud config set project $PROJECT_ID

# 3. Création de la machine virtuelle
echo "🖥️ Création de la machine virtuelle (e2-medium, Ubuntu 22.04)..."
gcloud compute instances create supabase-server \
    --zone=europe-west9-a \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-ssd \
    --tags=http-server,https-server

# 4. Règles de pare-feu
echo "🛡️ Configuration du pare-feu (Ouverture des ports 8000 et 5432)..."
gcloud compute firewall-rules create allow-supabase \
    --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
    --rules=tcp:8000,tcp:80,tcp:443,tcp:5432 --source-ranges=0.0.0.0/0 \
    --target-tags=http-server

# 5. Attendre que la VM soit prête
echo "⏳ Attente de l'initialisation de la VM (30 secondes)..."
sleep 30

# 6. Déploiement de Supabase via SSH
echo "🐳 Installation de Docker et Supabase sur le serveur..."
gcloud compute ssh ubuntu@supabase-server --zone=europe-west9-a --command="
    sudo apt-get update && sudo apt-get upgrade -y
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo apt-get install -y docker-compose-plugin
    sudo usermod -aG docker \$USER
    git clone --depth 1 https://github.com/supabase/supabase
    cd supabase/docker
    cp .env.example .env
    sudo docker compose pull
    sudo docker compose config
    sudo docker compose up -d
"

# 7. Récupération de l'IP
IP_EXT=$(gcloud compute instances describe supabase-server --zone=europe-west9-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "======================================================"
echo "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "======================================================"
echo "Votre serveur Supabase tourne sur : http://$IP_EXT:8000"
echo "L'interface Studio est accessible sur : http://$IP_EXT:8000/project/default/editor"
echo "Veuillez récupérer les clés dans le fichier .env sur le serveur pour mettre à jour votre projet !"
echo "======================================================"
