// Constantes para categorias e chave do localStorage
const CATEGORIAS = {
    Receita: {
        _default: ["Salário", "Freelance", "Rendimentos", "Investimentos", "Reembolso", "Venda", "Outros"],
        Salário: ["CLT", "PJ", "Autônomo"],
        Freelance: ["Projeto A", "Projeto B", "Outros Serviços"],
        Rendimentos: ["Poupança", "CDB", "LCI/LCA", "Fundos"],
        Investimentos: ["Ações", "Cripto", "FIIs", "Tesouro Direto"],
        Reembolso: ["Viagem", "Despesa Médica", "Outros"],
        Venda: ["Produtos", "Serviços"],
        Outros: ["Doação Recebida", "Presente"]
    },
    Despesa: {
        _default: ["Aluguel", "Energia", "Água", "Internet", "Mercado", "Transporte", "Educação", "Saúde", "Cartão de Crédito", "Lazer", "Outros"],
        Aluguel: ["Residencial", "Comercial", "Temporada"],
        Energia: ["Residencial", "Comercial"],
        Água: ["Residencial", "Comercial"],
        Internet: ["Residencial", "Móvel", "Comercial"],
        Mercado: ["Supermercado", "Hortifruti", "Padaria"],
        Transporte: ["Combustível", "Aplicativo", "Público", "Manutenção Veículo"],
        Educação: ["Mensalidade", "Cursos", "Material"],
        Saúde: ["Plano de Saúde", "Consultas", "Medicamentos"],
        'Cartão de Crédito': ["Banco do Brasil", "Nubank", "Inter", "Outro Banco"], // Adicionado para o Cartão de Crédito
        Lazer: ["Restaurantes", "Cinema/Teatro", "Viagens", "Hobbies"],
        Outros: ["Impostos", "Doações", "Multas"]
    }
};
const LOCAL_STORAGE_KEY = 'contasContaFacil';

// Variáveis de estado
let contas = [];
let editandoIndex = -1; // -1 significa que não está editando
let resumoChartInstance = null; // Variável para a instância do Chart.js

// Referências aos elementos do DOM
const elements = {
    tipoSelect: document.getElementById('tipo'),
    categoriaSelect: document.getElementById('categoria'),
    tipoContaSelect: document.getElementById('tipoConta'), // NOVO ELEMENTO
    pagamentoSelect: document.getElementById('pagamento'),
    valorInput: document.getElementById('valor'),
    formAdicionarConta: document.getElementById('formAdicionarConta'),
    listaContasDiv: document.getElementById('listaContas'),
    resumoGeralDiv: document.getElementById('resumoGeral'),
    resumoChartCanvas: document.getElementById('resumoChart'),
    exportarResumoPDFBtn: document.getElementById('exportarResumoPDFBtn'),
    tabsList: document.getElementById('tabs')
};

/**
 * Funções de Utilitário
 */

// Carrega as contas do LocalStorage ao iniciar
function carregarContas() {
    try {
        const storedContas = localStorage.getItem(LOCAL_STORAGE_KEY);
        contas = storedContas ? JSON.parse(storedContas) : [];
    } catch (e) {
        console.error("Erro ao carregar contas do LocalStorage:", e);
        contas = []; // Resetar em caso de erro de parse
        mostrarMensagem('alert-danger', 'Houve um erro ao carregar seus dados salvos.');
    }
}

// Salva as contas no LocalStorage
function salvarContas() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contas));
    } catch (e) {
        console.error("Erro ao salvar contas no LocalStorage:", e);
        mostrarMensagem('alert-danger', 'Não foi possível salvar os dados. Verifique o espaço de armazenamento do navegador.');
    }
}

// Formata o valor do input como moeda brasileira em tempo real
function formatarMoeda(campo) {
    let valor = campo.value.replace(/\D/g, ""); // Remove tudo que não é dígito

    if (valor.length === 0) {
        campo.value = "";
        return;
    }

    // Adiciona zeros à esquerda se o valor for muito pequeno para ter centavos
    while (valor.length < 3) {
        valor = "0" + valor;
    }

    // Separa os centavos (últimos 2 dígitos) do restante
    let parteInteira = valor.substring(0, valor.length - 2);
    let parteDecimal = valor.substring(valor.length - 2);

    // Formata a parte inteira com pontos para milhares
    parteInteira = parseInt(parteInteira).toLocaleString('pt-BR');

    // Junta tudo com a vírgula para os centavos
    campo.value = `${parteInteira},${parteDecimal}`;
}

// Exibe uma mensagem temporária na interface
function mostrarMensagem(tipo, mensagem) {
    const container = document.querySelector('.container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${tipo} mt-3`;
    alertDiv.textContent = mensagem;
    container.insertBefore(alertDiv, elements.tabsList.nextSibling); // Insere após as abas

    setTimeout(() => {
        alertDiv.remove();
    }, 4000); // Remove a mensagem após 4 segundos
}

/**
 * Funções de Renderização e Lógica da Aplicação
 */

// Atualiza as opções de categoria com base no tipo selecionado (Receita/Despesa)
function atualizarCategorias() {
    const tipo = elements.tipoSelect.value;
    const categoriasDoTipo = CATEGORIAS[tipo]._default || []; // Pega o array default
    elements.categoriaSelect.innerHTML = ''; // Limpa as opções existentes

    categoriasDoTipo.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        elements.categoriaSelect.appendChild(opt);
    });

    atualizarTiposDeConta(); // Chama para atualizar os tipos de conta baseados na primeira categoria
}

// NOVO: Atualiza as opções de tipo de conta com base na categoria selecionada
function atualizarTiposDeConta() {
    const tipo = elements.tipoSelect.value;
    const categoria = elements.categoriaSelect.value;
    const tiposDeContaDaCategoria = CATEGORIAS[tipo][categoria] || []; // Pega o array específico da categoria
    elements.tipoContaSelect.innerHTML = ''; // Limpa as opções existentes

    if (tiposDeContaDaCategoria.length > 0) {
        elements.tipoContaSelect.style.display = 'block'; // Mostra o select se houver opções
        tiposDeContaDaCategoria.forEach(subCat => {
            const opt = document.createElement('option');
            opt.value = subCat;
            opt.textContent = subCat;
            elements.tipoContaSelect.appendChild(opt);
        });
    } else {
        elements.tipoContaSelect.style.display = 'none'; // Esconde se não houver opções específicas
        // Opcional: Adicionar uma opção padrão se não houver tipos específicos
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhum tipo específico';
        elements.tipoContaSelect.appendChild(opt);
    }
}

// Renderiza a lista de contas no DOM
function renderizarContas() {
    elements.listaContasDiv.innerHTML = ''; // Limpa a lista existente

    if (contas.length === 0) {
        elements.listaContasDiv.innerHTML = '<p class="text-muted">Nenhuma conta cadastrada ainda. Adicione uma nova conta!</p>';
        return;
    }

    contas.forEach((conta, index) => {
        const div = document.createElement('div');
        div.className = `conta ${conta.tipo.toLowerCase()} card p-3 mt-3`;

        let statusPagamento = '';
        let badgeClass = '';
        if (conta.tipo === 'Despesa') {
            if (conta.paga) {
                statusPagamento = 'Paga';
                badgeClass = 'text-success';
            } else {
                statusPagamento = 'Pendente';
                badgeClass = 'text-warning';
            }
        } else {
            // Receitas não têm status de pagamento como despesas
            statusPagamento = 'Registrada';
            badgeClass = 'text-info';
        }

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <p class="mb-1"><strong>Categoria:</strong> ${conta.categoria}</p>
                    ${conta.tipoConta ? `<p class="mb-1"><strong>Tipo de Conta:</strong> ${conta.tipoConta}</p>` : ''} <p class="mb-1"><strong>Pagamento:</strong> ${conta.pagamento}</p>
                    <p class="mb-1"><strong>Tipo:</strong> ${conta.tipo}</p>
                    <p class="mb-0"><strong>Valor:</strong> R$ ${conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div class="text-end">
                    <span class="badge ${badgeClass}">${statusPagamento}</span>
                    <div class="botoes mt-2">
                        ${conta.tipo === 'Despesa' && !conta.paga ? `<button class='btn btn-success btn-sm me-2' data-action="confirmar-pagamento" data-index="${index}">Confirmar</button>` : ''}
                        <button class="btn btn-secondary btn-sm me-2" data-action="editar" data-index="${index}">Editar</button>
                        <button class="btn btn-danger btn-sm" data-action="excluir" data-index="${index}">Excluir</button>
                    </div>
                </div>
            </div>
        `;
        elements.listaContasDiv.appendChild(div);
    });
}

// Adiciona ou atualiza uma conta
function adicionarOuAtualizarConta() {
    const tipo = elements.tipoSelect.value;
    const categoria = elements.categoriaSelect.value;
    const tipoConta = elements.tipoContaSelect.value; // NOVO: Captura o valor do tipo de conta
    const pagamento = elements.pagamentoSelect.value;
    // Converte o valor formatado para um número para armazenamento
    const valorRaw = elements.valorInput.value.replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(valorRaw);

    if (isNaN(valor) || valor <= 0) {
        mostrarMensagem('alert-danger', 'Por favor, insira um valor numérico válido e maior que zero.');
        return;
    }

    // Se o select de tipoConta estiver visível e a opção selecionada for "Nenhum tipo específico", não salvar
    if (elements.tipoContaSelect.style.display !== 'none' && tipoConta === '') {
        mostrarMensagem('alert-danger', 'Por favor, selecione um tipo de conta válido ou "Nenhum tipo específico" se aplicável.');
        return;
    }


    if (editandoIndex === -1) {
        // Adicionar nova conta
        contas.push({ tipo, valor, categoria, tipoConta: tipoConta === '' ? undefined : tipoConta, pagamento, paga: false }); // Salva tipoConta ou undefined
        mostrarMensagem('alert-success', 'Conta adicionada com sucesso!');
    } else {
        // Atualizar conta existente
        contas[editandoIndex] = { ...contas[editandoIndex], tipo, valor, categoria, tipoConta: tipoConta === '' ? undefined : tipoConta, pagamento }; // Atualiza tipoConta ou undefined
        editandoIndex = -1; // Resetar modo de edição
        mostrarMensagem('alert-info', 'Conta atualizada com sucesso!');
        elements.formAdicionarConta.querySelector('button[type="submit"]').textContent = 'Adicionar Conta';
    }

    salvarContas();
    renderizarContas();
    elements.formAdicionarConta.reset(); // Limpa os selects e o campo de valor padrão
    elements.valorInput.value = ''; // Limpa o campo de valor explicitamente
    atualizarCategorias(); // Garante que as categorias e tipos de conta estejam corretas para o padrão
}

// Exclui uma conta
function excluirConta(index) {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
        contas.splice(index, 1);
        salvarContas();
        renderizarContas();
        mostrarMensagem('alert-danger', 'Conta excluída!');
    }
}

// Preenche o formulário para edição de uma conta
function editarConta(index) {
    const conta = contas[index];
    elements.tipoSelect.value = conta.tipo;
    // Precisamos chamar atualizarCategorias e, em seguida, atualizarTiposDeConta
    // antes de definir os valores para garantir que as opções corretas existam.
    atualizarCategorias();
    // Pequeno delay para garantir que a DOM foi atualizada
    setTimeout(() => {
        elements.categoriaSelect.value = conta.categoria;
        atualizarTiposDeConta(); // Atualiza tipos de conta com base na categoria agora definida
        setTimeout(() => {
            if (conta.tipoConta) {
                elements.tipoContaSelect.value = conta.tipoConta;
                elements.tipoContaSelect.style.display = 'block'; // Garante que esteja visível
            } else {
                elements.tipoContaSelect.value = ''; // Reseta se não houver tipoConta
                elements.tipoContaSelect.style.display = 'none'; // Esconde se não houver tipoConta
            }
            elements.pagamentoSelect.value = conta.pagamento;
            elements.valorInput.value = conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }, 50); // Mais um pequeno delay para o tipoConta
    }, 50); // Delay para a categoria


    editandoIndex = index; // Define o índice da conta que está sendo editada
    elements.formAdicionarConta.querySelector('button[type="submit"]').textContent = 'Atualizar Conta';
    mostrarMensagem('alert-info', 'Você está editando uma conta. Altere os campos e clique em "Atualizar Conta".');
    elements.tipoSelect.focus(); // Foca no primeiro campo do formulário
}

// Confirma o pagamento de uma despesa
function confirmarPagamento(index) {
    if (contas[index].tipo === 'Despesa' && !contas[index].paga) {
        contas[index].paga = true;
        salvarContas();
        renderizarContas();
        mostrarMensagem('alert-success', 'Pagamento confirmado!');
    }
}

// Cria ou atualiza o gráfico no resumo geral
function criarOuAtualizarGrafico(totalReceitas, totalDespesasPagas, despesasPendentes) {
    const ctx = elements.resumoChartCanvas.getContext('2d');

    // Destrói a instância anterior do gráfico se existir
    if (resumoChartInstance) {
        resumoChartInstance.destroy();
    }

    resumoChartInstance = new Chart(ctx, {
        type: 'bar', // Tipo de gráfico de barras
        data: {
            labels: ['Receitas', 'Despesas Pagas', 'Despesas Pendentes'],
            datasets: [{
                label: 'Valores',
                data: [totalReceitas, totalDespesasPagas, despesasPendentes],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.7)', // Verde para Receitas
                    'rgba(231, 76, 60, 0.7)',  // Vermelho para Despesas Pagas
                    'rgba(243, 156, 18, 0.7)'   // Laranja para Despesas Pendentes
                ],
                borderColor: [
                    'rgba(46, 204, 113, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(243, 156, 18, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite que o gráfico use a altura definida no CSS
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valor (R$)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Não exibir a legenda, pois as labels já são claras
                },
                title: {
                    display: true,
                    text: 'Visão Geral Financeira',
                    font: {
                        size: 16
                    },
                    color: '#2C3E50'
                }
            }
        }
    });
}

// Atualiza o resumo geral na aba "Resumo Geral"
function atualizarResumo() {
    const totalReceitas = contas.filter(c => c.tipo === 'Receita').reduce((acc, c) => acc + c.valor, 0);
    const totalDespesasPagas = contas.filter(c => c.tipo === 'Despesa' && c.paga).reduce((acc, c) => acc + c.valor, 0);
    const despesasPendentes = contas.filter(c => c.tipo === 'Despesa' && !c.paga).reduce((acc, c) => acc + c.valor, 0);
    const saldo = totalReceitas - totalDespesasPagas - despesasPendentes; // Saldo real considerando tudo

    elements.resumoGeralDiv.innerHTML = `
        <p><strong>Total de Receitas:</strong> <span class="text-success">R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <p><strong>Despesas Pagas:</strong> <span class="text-danger">R$ ${totalDespesasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <p><strong>Despesas Pendentes:</strong> <span class="text-warning">R$ ${despesasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <hr>
        <p><strong>Saldo Atual:</strong> <span class="${saldo >= 0 ? 'text-success' : 'text-danger'}">R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
    `;

    // Atualiza o gráfico com os novos dados
    criarOuAtualizarGrafico(totalReceitas, totalDespesasPagas, despesasPendentes);
}

// Exporta o resumo para PDF
async function exportarResumoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const totalReceitas = contas.filter(c => c.tipo === 'Receita').reduce((acc, c) => acc + c.valor, 0);
    const totalDespesasPagas = contas.filter(c => c.tipo === 'Despesa' && c.paga).reduce((acc, c) => acc + c.valor, 0);
    const despesasPendentes = contas.filter(c => c.tipo === 'Despesa' && !c.paga).reduce((acc, c) => acc + c.valor, 0);
    const saldo = totalReceitas - totalDespesasPagas - despesasPendentes;

    const dataHoraGeracao = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Resumo Financeiro - ContaFácil", 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Reduzir um pouco o tamanho para a data/hora
    doc.text(`Gerado em: ${dataHoraGeracao}`, 20, 30); // Adiciona data e hora
    doc.setFontSize(12); // Retorna ao tamanho padrão para o conteúdo
    doc.text("---------------------------------------------", 20, 40);

    doc.text(`Total de Receitas: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 50);
    doc.text(`Despesas Pagas: R$ ${totalDespesasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 60);
    doc.text(`Despesas Pendentes: R$ ${despesasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 70);
    doc.text(`Saldo Atual: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 80);

    // Adiciona uma lista de contas (opcional, mas útil para o PDF)
    if (contas.length > 0) {
        doc.setFontSize(14);
        doc.text("Detalhes das Contas:", 20, 100);
        doc.setFontSize(10);
        let y = 110;
        contas.forEach(conta => {
            // Inclui o tipoConta no PDF se ele existir
            const tipoContaTexto = conta.tipoConta ? ` (${conta.tipoConta})` : '';
            doc.text(`${conta.tipo}: ${conta.categoria}${tipoContaTexto} - R$ ${conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${conta.paga ? 'Paga' : 'Pendente'})`, 25, y);
            y += 7;
        });
    }

    // Nome do arquivo PDF com data e hora
    const now = new Date();
    const dataString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const horaString = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const nomeArquivo = `Resumo_Financeiro_${dataString}_${horaString}.pdf`;
    doc.save(nomeArquivo);
    mostrarMensagem('alert-success', `PDF exportado com sucesso! Arquivo: ${nomeArquivo}`);
}

/**
 * Configuração de Event Listeners
 */

document.addEventListener('DOMContentLoaded', () => {
    carregarContas();
    atualizarCategorias(); // Chama para iniciar categorias e tipos de conta
    renderizarContas();
});

// Listener para o formulário de adicionar/atualizar conta
elements.formAdicionarConta.addEventListener('submit', (event) => {
    event.preventDefault(); // Impede o recarregamento da página
    adicionarOuAtualizarConta();
});

// Listener para o input de valor para formatar moeda
elements.valorInput.addEventListener('input', (event) => {
    formatarMoeda(event.target);
});

// Listener para o select de tipo de conta (receita/despesa)
elements.tipoSelect.addEventListener('change', atualizarCategorias);

// NOVO: Listener para o select de categoria para atualizar os tipos de conta
elements.categoriaSelect.addEventListener('change', atualizarTiposDeConta);


// Delegação de eventos para os botões da lista de contas (editar, excluir, confirmar)
elements.listaContasDiv.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON') {
        const action = target.dataset.action;
        const index = parseInt(target.dataset.index);

        if (action === 'editar') {
            editarConta(index);
        } else if (action === 'excluir') {
            excluirConta(index);
        } else if (action === 'confirmar-pagamento') {
            confirmarPagamento(index);
        }
    }
});

// Listener para o botão de exportar PDF
elements.exportarResumoPDFBtn.addEventListener('click', exportarResumoPDF);

// Delegação de eventos para as abas (usando a funcionalidade do Bootstrap)
elements.tabsList.addEventListener('shown.bs.tab', (event) => {
    const activeTabId = event.target.getAttribute('data-bs-target');
    if (activeTabId === '#resumo') {
        atualizarResumo(); // Chama a função para atualizar o resumo e o gráfico
    }
});