const fs = require('fs');
let code = fs.readFileSync('src/components/clients/ClientsView.tsx', 'utf8');

code = code.replace("import { useState } from 'react';", "import React, { useState, useMemo, useCallback, memo } from 'react';");

code = code.replace(
  "  const getRegimeLabel = (regime: RegimeType) => {",
  "  const getRegimeLabel = useCallback((regime: RegimeType) => {"
);
code = code.replace(
  "      case 'N': return 'Non assujetti';\n    }\n  };",
  "      case 'N': return 'Non assujetti';\n    }\n  }, []);"
);
code = code.replace(
  "  const getTotalFee = (client: Client) => {",
  "  const getTotalFee = useCallback((client: Client) => {"
);
code = code.replace(
  "    return (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);\n  };",
  "    return (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);\n  }, []);"
);

const oldFiltered = `  const filteredClients = sortWithFavorites(
    clients.filter(c => {
      // Filtrage par périmètre de scope
      if (filterScope === 'my' && c.user_id !== user?.id) return false;

      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase());
      const matchRegime = filterRegime === 'all' || c.regime === filterRegime;
      const matchApe = !filterApe || (c.code_ape && c.code_ape.toLowerCase().includes(filterApe.toLowerCase()));
      return matchSearch && matchRegime && matchApe;
    })
  );`;
const newFiltered = `  const filteredClients = useMemo(() => {
    return sortWithFavorites(
      clients.filter(c => {
        if (filterScope === 'my' && c.user_id !== user?.id) return false;
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase());
        const matchRegime = filterRegime === 'all' || c.regime === filterRegime;
        const matchApe = !filterApe || (c.code_ape && c.code_ape.toLowerCase().includes(filterApe.toLowerCase()));
        return matchSearch && matchRegime && matchApe;
      })
    );
  }, [clients, filterScope, user?.id, search, filterRegime, filterApe, sortWithFavorites]);`;
code = code.replace(oldFiltered, newFiltered);

const match = code.match(/<div\n\s+key=\{client\.id\}[\s\S]*?<\/div>\n\s+<\/div>\n\s+<\/div>\n\s+\)\)\}/);
if (match) {
  let cardJsx = match[0].replace('))}', '');
  
  cardJsx = cardJsx.replace(/onClick=\{\(\) => setSelectedClientForDetail\(client\)\}/g, "onClick={onSelectDetail}");
  cardJsx = cardJsx.replace(/isFavorite\{isFavorite\(client.id\)}/g, "isFavorite={isFavorite}");
  cardJsx = cardJsx.replace(/isFavorite\(client.id\)/g, "isFavorite");
  cardJsx = cardJsx.replace(/toggleFavorite\(client.id\)/g, "onToggleFavorite()");
  cardJsx = cardJsx.replace(/setSelectedClientForDetail\(client\)/g, "onSelectDetail()");
  cardJsx = cardJsx.replace(/setAssignModalClient\(client\)/g, "onAssign()");
  cardJsx = cardJsx.replace(/openModal\(client\)/g, "onEdit()");
  cardJsx = cardJsx.replace(/handleDelete\(client.id\)/g, "onDelete()");

  const componentStr = `
const ClientCard = memo(({
  client,
  isFavorite,
  onToggleFavorite,
  onSelectDetail,
  onAssign,
  onEdit,
  onDelete,
  timerState,
  startTimer,
  getRegimeLabel,
  getTotalFee
}: any) => {
  return (
    ${cardJsx.trim()}
  );
});

`;
  
  code = code.replace('export function ClientsView(', componentStr + 'export function ClientsView(');

  const newGridMap = `<ClientCard
              key={client.id}
              client={client}
              isFavorite={isFavorite(client.id)}
              onToggleFavorite={() => toggleFavorite(client.id)}
              onSelectDetail={() => setSelectedClientForDetail(client)}
              onAssign={onAssign && (userRole === 'manager' || userRole === 'team_lead') ? () => setAssignModalClient(client) : undefined}
              onEdit={() => openModal(client)}
              onDelete={() => handleDelete(client.id)}
              timerState={timerState}
              startTimer={startTimer}
              getRegimeLabel={getRegimeLabel}
              getTotalFee={getTotalFee}
            />
          ))}`;
  code = code.replace(match[0], newGridMap);
}

fs.writeFileSync('src/components/clients/ClientsView.tsx', code);
