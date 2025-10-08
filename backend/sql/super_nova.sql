
CREATE DATABASE IF NOT EXISTS supernova;
USE supernova;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone CHAR(11) NOT NULL UNIQUE,
    data_nascimento DATE,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);


-- Tabela de Categorias de Esportes
CREATE TABLE categorias_esportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_categoria VARCHAR(100) NOT NULL
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),             
    dimensoes VARCHAR(100),
    garantia_meses INT DEFAULT 0
);

CREATE TABLE seminovos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    marca VARCHAR(100) NOT NULL,       
    email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    gratuito BOOLEAN NOT NULL,
    preco DECIMAL(10,2),
    endereco VARCHAR(200) NOT NULL,
    data_evento DATE
);

ALTER TABLE seminovos
ADD COLUMN id_categoria INT NULL,
ADD COLUMN imagem VARCHAR(255) NULL;
