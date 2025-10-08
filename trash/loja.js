function abrirCategorias() {
  let categorias = document.getElementById("categorias");
  categorias.classList.add("ativo");
  let slider = document.getElementById("slider_publicidade");
  slider.style.zIndex = "-1"

  let sair_categorias = document.getElementById("sair_categorias");
  sair_categorias.addEventListener("click", function () {
    categorias.classList.remove("ativo");
    
    slider.style.zIndex = "1"
  });

  let itensCategoria = document.querySelectorAll(".categoria_item");
  let contentDiv = document.getElementById("content_categoria");

  const dadosCategorias = {
    masculino: {
      imagem: "/img/banner1.jpg",
      itens: [
        {
          titulo: "Calçados",
          produtos: ["Botas", "Tênis", "Tênis de Corrida", "Ver mais"]
        },
        {
          titulo: "Roupas",
          produtos: ["Bermudas", "Calças", "Camisetas", "Jaquetas e Casacos", "Shorts", "Ver mais"]
        },
        {
          titulo: "Acessórios",
          produtos: ["Bonés", "Capacetes", "Meias", "Mochilas", "Óculos", "Relógios", "Ver mais"]
        },
        {
          titulo: "Beleza",
          produtos: ["Desodorantes", "Protetor Solar", "Ver mais"]
        }
      ]
    },
    feminino: {
      imagem: "/img/banner2.jpg",
      itens: [
        {
          titulo: "Calçados",
          produtos: ["Tênis", "Tênis Casuais", "Tênis Esportivos", "Ver mais"]
        },
        {
          titulo: "Roupas",
          produtos: ["Leggings", "Saias Esportivas", "Camisetas", "Jaquetas e Casacos", "Top Fitness", "Ver mais"]
        },
        {
          titulo: "Acessórios",
          produtos: ["Faixas", "Meias", "Mochilas", "Óculos", "Bonés", "Relógios", "Ver mais"]
        },
        {
          titulo: "Beleza",
          produtos: ["Protetor Solar", "Shampoo Pós-treino", "Ver mais"]
        }
      ]
    },
    infantil: {
      imagem: "/img/banner4.jpg",
      itens: [
        {
          titulo: "Calçados",
          produtos: ["Tênis", "Sandálias", "Botinhas", "Ver mais"]
        },
        {
          titulo: "Roupas",
          produtos: ["Camisetas", "Conjuntos", "Jaquetas", "Calças", "Ver mais"]
        },
        {
          titulo: "Brinquedos Esportivos",
          produtos: ["Bolas", "Mini Redes", "Skates", "Ver mais"]
        }
      ]
    },
    equipamentos: {
      imagem: "/img/banner3.jpg",
      itens: [
        {
          titulo: "Camping",
          produtos: ["Barracas", "Sacos de Dormir", "Lanternas", "Ver mais"]
        },
        {
          titulo: "Escalada",
          produtos: ["Cordas", "Mosquetões", "Capacetes", "Ver mais"]
        },
        {
          titulo: "Fitness",
          produtos: ["Halteres", "Tapetes de Yoga", "Elásticos", "Ver mais"]
        }
      ]
    },
  };

  function gerarConteudo(categoria) {
    const dados = dadosCategorias[categoria];
    if (!dados) return;

    // Limpa conteúdo atual
    contentDiv.innerHTML = "";

    // Cria os blocos de itens
    dados.itens.forEach(secao => {
      const bloco = document.createElement("div");
      bloco.classList.add("itens");

      const titulo = document.createElement("h1");
      titulo.textContent = secao.titulo;
      bloco.appendChild(titulo);

      secao.produtos.forEach(produto => {
        const p = document.createElement("p");
        p.textContent = produto;
        if (produto.toLowerCase().includes("ver mais")) {
          p.id = "verMais";
        }
        bloco.appendChild(p);
      });

      contentDiv.appendChild(bloco);
    });

    // Adiciona imagem
    const imagemDiv = document.createElement("div");
    imagemDiv.classList.add("imagem_categoria");

    const img = document.createElement("img");
    img.src = dados.imagem;
    img.alt = `Banner ${categoria}`;

    imagemDiv.appendChild(img);
    contentDiv.appendChild(imagemDiv);
  }

  // Gera conteúdo inicial (masculino)
  gerarConteudo("masculino");

  itensCategoria.forEach(item => {
    item.addEventListener("click", () => {
      itensCategoria.forEach(i => i.classList.remove("ativo"));
      item.classList.add("ativo");

      const categoriaSelecionada = item.getAttribute("data-categoria");
      gerarConteudo(categoriaSelecionada);
    });
  });
}
